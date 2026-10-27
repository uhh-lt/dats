import re
from abc import abstractmethod
from collections.abc import Iterator
from typing import Any, Generic, TypeVar

from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.project.project_crud import crud_project
from modules.llm_assistant.llm_assistant_enum import (
    DataTag,
    PromptPlaceholder,
    StrategyType,
)
from modules.llm_assistant.llm_assistant_exceptions import (
    InvalidPromptPreviewError,
    InvalidPromptTemplateError,
)
from modules.llm_assistant.llm_assistant_job_dto import (
    DocumentBasedTaskParams,
    LLMAssistantPromptTemplates,
    SpecificStrategyParameters,
)
from modules.llm_assistant.prompts.system_prompt import system_prompt_templates
from modules.llm_assistant.strategies.types.parsed_span import ParsedSpan
from repos.llm_repo import LLMMessage

# The strategy params type
StrategyParamsT = TypeVar("StrategyParamsT", bound=SpecificStrategyParameters)


def fill_placeholders(template: str, values: dict[str, str]) -> str:
    """Replace all placeholders of a template in a single pass.

    Inserted values are never scanned again, so a document or a code description
    that contains a placeholder text (e.g. "<codes>") is inserted verbatim.
    """
    if not values:
        return template
    pattern = re.compile("|".join(re.escape(placeholder) for placeholder in values))
    return pattern.sub(lambda match: values[match.group(0)], template)


class LLMAssistantStrategy(Generic[StrategyParamsT]):
    """A strategy describes HOW the LLM assistant does a job.

    It combines the prompt-building machinery with:
    - the structured-output response model used for the LLM call
    - parsing of the LLM response (``parse_result``)
    - grounding of parsed results to document offsets (where applicable)
    - chunking behaviour (via the DataTag mechanism)

    A strategy declares which DataTags (document content placeholders) it
    supports via ``allowed_data_tags``; prompt validation fails fast if a
    template uses an unsupported tag.

    Prompt building
    ---------------
    A system prompt template may contain the placeholders "<project_title>"
    and "<project_description>".
    A user prompt template must contain exactly one of the data placeholders
    "<document>", "<sentence>" or "<chunk>". Strategies that work with
    category definitions (``definitions_placeholder``, e.g. "<codes>") require
    that placeholder in the user prompt and render it from the definitions
    passed as data, so templates and definitions can change independently.

    A user prompt template usually consists of these building blocks:
    1. The task description, e.g. Please classify the documents ...
    2. The categories or fields to work with
    3. Semantic requirements that are not fully expressed by the response schema
    4. Optional examples demonstrating the intended classification or extraction
    5. The document content placeholder
    6. A brief reiteration of important task constraints

    Consequently, prompts can contain the following building blocks:
    <task_description>
    <task_data>
    <semantic_requirements>
    <answer_example>
    <document>
    <task_reiteration>
    """

    # The strategy type this class implements.
    strategy_type: StrategyType
    # Human-readable name (shown in the frontend).
    display_name: str
    # Explanation of what the strategy does (shown in the frontend).
    description: str
    # The params model type for this strategy.
    strategy_params_type: type[StrategyParamsT]
    # The DataTags this strategy supports.
    allowed_data_tags: list[DataTag] = [DataTag.DOCUMENT]
    # The placeholder for the category definitions in the user prompt, rendered
    # by ``_render_definitions``. None if the strategy has no such placeholder.
    definitions_placeholder: PromptPlaceholder | None = None

    supported_languages = ["en", "de"]
    system_prompt_templates = system_prompt_templates

    def __init__(
        self,
        db: Session,
        project_id: int,
        is_fewshot: bool,
        params: DocumentBasedTaskParams,
        # if no prompt templates are provided, the default ones are built from params
        prompt_templates: list[LLMAssistantPromptTemplates] | None = None,
        example_ids: list[int] | None = None,
    ):
        project = crud_project.read(db=db, id=project_id)
        self.project_title = project.title
        self.project_description = project.description
        self.is_fewshot = is_fewshot

        # if no prompt templates are provided, create the default ones
        if prompt_templates is None:
            prompt_templates = self._build_prompt_templates(
                params=params, example_ids=example_ids
            )

        # validate provided prompts and remember the data tag that is used in
        # the user prompt templates (e.g. "<document>" or "<sentence>")
        self.data_tag = self.validate_prompt_templates(prompt_templates)
        self.lang2prompt_templates = {p.language: p for p in prompt_templates}

    # STRATEGY METADATA

    def get_response_model(self) -> type[BaseModel]:
        """The pydantic model used as the structured-output schema."""
        raise NotImplementedError()

    @abstractmethod
    def parse_result(
        self,
        result: Any,
        sdoc_data: SourceDocumentDataORM,
        message_id: int,
    ) -> list[ParsedSpan]:
        """Parse a validated LLM response into spans with absolute char offsets.

        Args:
            result: The validated LLM response (instance of ``get_response_model()``).
            sdoc_data: The source document data (for grounding/offset computation).
            message_id: The index of the message within the document (e.g. sentence
                index for sentence-level strategies, chunk index for chunk-level).
        """
        ...

    @classmethod
    def default_params(cls) -> StrategyParamsT:
        """Default strategy parameters."""
        return cls.strategy_params_type.model_validate(
            {"strategy_type": cls.strategy_type}
        )

    # VALIDATION

    @classmethod
    def validate_prompt_templates(
        cls, prompt_templates: list[LLMAssistantPromptTemplates]
    ) -> DataTag:
        """Validate the templates of all supported languages.

        Every supported language has exactly one template. Each user prompt
        contains exactly one data tag, which the strategy supports and which is
        the same in all languages, and the strategy's definitions placeholder.
        Placeholders that the strategy does not render are rejected.

        Returns:
            The data tag shared by all user prompts.

        Raises:
            InvalidPromptTemplateError: If a rule is violated.
        """
        lang2prompt_templates: dict[str, LLMAssistantPromptTemplates] = {}
        for prompts in prompt_templates:
            if prompts.language not in cls.supported_languages:
                raise InvalidPromptTemplateError(
                    f"Language '{prompts.language}' is not supported! "
                    f"Supported languages are {cls.supported_languages}."
                )
            if prompts.language in lang2prompt_templates:
                raise InvalidPromptTemplateError(
                    f"Multiple prompts provided for language '{prompts.language}'!"
                )
            lang2prompt_templates[prompts.language] = prompts

        allowed_tags = [tag.value for tag in cls.allowed_data_tags]
        data_tags: list[DataTag] = []
        for language in cls.supported_languages:
            if language not in lang2prompt_templates:
                raise InvalidPromptTemplateError(
                    f"No prompts provided for language '{language}'!"
                )
            prompts = lang2prompt_templates[language]
            used_tags = [tag for tag in DataTag if tag.value in prompts.user_prompt]
            if len(used_tags) == 0:
                raise InvalidPromptTemplateError(
                    f"The user prompt for language '{language}' contains no data tag! "
                    f"Valid tags are {allowed_tags}."
                )
            if len(used_tags) > 1:
                raise InvalidPromptTemplateError(
                    f"The user prompt for language '{language}' contains multiple "
                    f"data tags ({[tag.value for tag in used_tags]})! Use exactly one."
                )
            if used_tags[0] not in cls.allowed_data_tags:
                raise InvalidPromptTemplateError(
                    f"The data tag {used_tags[0].value} in the user prompt for language "
                    f"'{language}' is not supported! Valid tags are {allowed_tags}."
                )
            data_tags.append(used_tags[0])
            cls._validate_definitions_placeholder(language=language, prompts=prompts)

        if len(set(data_tags)) > 1:
            raise InvalidPromptTemplateError(
                f"Different data tags ({sorted(tag.value for tag in set(data_tags))}) "
                "used in different languages!"
            )
        return data_tags[0]

    @classmethod
    def _validate_definitions_placeholder(
        cls, *, language: str, prompts: LLMAssistantPromptTemplates
    ) -> None:
        """Require the strategy's definitions placeholder in the user prompt only."""
        codes = PromptPlaceholder.CODES.value
        if codes in prompts.system_prompt:
            raise InvalidPromptTemplateError(
                f"The system prompt for language '{language}' must not contain {codes}!"
            )
        if cls.definitions_placeholder is None:
            if codes in prompts.user_prompt:
                raise InvalidPromptTemplateError(
                    f"This strategy does not support the placeholder {codes} "
                    f"(user prompt for language '{language}')!"
                )
            return
        placeholder = cls.definitions_placeholder.value
        if placeholder not in prompts.user_prompt:
            raise InvalidPromptTemplateError(
                f"The user prompt for language '{language}' must contain {placeholder}!"
            )

    # PROMPT BUILDING

    def _render_definitions(self, language: str) -> str:
        """Render the category definitions that replace ``definitions_placeholder``."""
        raise NotImplementedError()

    def _build_system_prompt(self, language: str) -> str:
        """Render the configured system prompt for a language and project."""
        if language not in self.supported_languages:
            raise ValueError("Language not supported")

        return fill_placeholders(
            self.lang2prompt_templates[language].system_prompt,
            {
                PromptPlaceholder.PROJECT_TITLE.value: self.project_title,
                PromptPlaceholder.PROJECT_DESCRIPTION.value: self.project_description,
            },
        )

    def _build_user_prompt(self, language: str, data: str) -> str:
        """Render the configured user prompt with the definitions and document data."""
        if language not in self.supported_languages:
            raise ValueError("Language not supported")

        values = {self.data_tag.value: data}
        if self.definitions_placeholder is not None:
            values[self.definitions_placeholder.value] = self._render_definitions(
                language
            )
        return fill_placeholders(
            self.lang2prompt_templates[language].user_prompt, values
        )

    def _iter_message_data(self, sdoc_data: SourceDocumentDataORM) -> Iterator[str]:
        """Yield the data that replaces the data tag, one item per LLM message."""
        match self.data_tag:
            case DataTag.DOCUMENT:
                yield sdoc_data.content
            case DataTag.SENTENCE:
                yield from sdoc_data.sentences
            case _:
                raise ValueError(f"Data tag {self.data_tag} not supported!")

    def generate_prompts(
        self, language: str, sdoc_data: SourceDocumentDataORM
    ) -> Iterator[LLMMessage]:
        """Yield the LLM messages required to process one document."""
        system_prompt = self._build_system_prompt(language)
        for data in self._iter_message_data(sdoc_data):
            yield LLMMessage(
                system_prompt=system_prompt,
                user_prompt=self._build_user_prompt(language=language, data=data),
            )

    def preview_prompt(
        self, language: str, sdoc_data: SourceDocumentDataORM, message_index: int
    ) -> tuple[LLMMessage, int]:
        """Render one message of a document exactly as ``generate_prompts`` does.

        Returns:
            The message and the number of messages of the document.

        Raises:
            InvalidPromptPreviewError: If the message index is out of range.
        """
        datas = list(self._iter_message_data(sdoc_data))
        if message_index >= len(datas):
            raise InvalidPromptPreviewError(
                f"Message {message_index} does not exist, document {sdoc_data.id} "
                f"has {len(datas)} message(s)."
            )
        return (
            LLMMessage(
                system_prompt=self._build_system_prompt(language),
                user_prompt=self._build_user_prompt(
                    language=language, data=datas[message_index]
                ),
            ),
            len(datas),
        )

    # PROMPT TEMPLATE BUILDING

    def _build_system_prompt_template(self, language: str) -> str:
        """Return the default system prompt template for a language."""
        return self.system_prompt_templates[language]

    def _build_user_prompt_template(
        self,
        *,
        language: str,
        example_ids: list[int] | None = None,
        params: DocumentBasedTaskParams,
    ) -> str:
        """Build the task-specific user prompt template for a language."""
        raise NotImplementedError()

    def _build_prompt_templates(
        self, params: DocumentBasedTaskParams, example_ids: list[int] | None = None
    ) -> list[LLMAssistantPromptTemplates]:
        """Build system and user prompt templates for every supported language."""
        if example_ids is not None and not self.is_fewshot:
            raise ValueError("Example IDs are only allowed for few-shot learning!")

        # create the prompt templates for all supported languages
        result: list[LLMAssistantPromptTemplates] = []
        for language in self.supported_languages:
            result.append(
                LLMAssistantPromptTemplates(
                    language=language,
                    system_prompt=self._build_system_prompt_template(language),
                    user_prompt=self._build_user_prompt_template(
                        language=language, example_ids=example_ids, params=params
                    ),
                )
            )
        return result
