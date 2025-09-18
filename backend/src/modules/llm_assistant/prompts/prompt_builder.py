from enum import Enum

from sqlalchemy.orm import Session

from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.project.project_crud import crud_project
from modules.llm_assistant.llm_job_dto import (
    DocumentBasedTaskParams,
    LLMPromptTemplates,
)
from repos.llm_repo import LLMMessage

# ENGLISH

en_system_prompt_template = """
You are a system to support the analysis of large amounts of text. You will always answer in the required format and use no other formatting than expected by the user!
"""

# GERMAN

de_system_prompt_template = """
Du bist ein System zur Unterstützung bei der Analyse großer Textmengen. Du antwortest immer in dem geforderten Format und verwendest keine andere Formatierung als vom Benutzer erwartet!
"""


class DataTag(str, Enum):
    DOCUMENT = "<document>"
    SENTENCE = "<sentence>"


class PromptBuilder:
    """
    Base class for building LLM prompts.
    A system prompt template may contain the placeholders "<project_title>" and "<project_description>".
    A user prompt template must contain the placeholder "<document>".

    A user prompt template always consists of the same building blocks
    1. The task description, e.g. Please classify the documents ...
    2. The categories to work with, e.g. Category 1 - Description 1, Category 2 - Description 2...
    3.1. Instructions on how to answer, e.g. Please answer in this format. The reasoning is optional.
    3.2. A generalized answer tempalte, e.g. Category: <category 1>\n Reasoning: <reasoning>
    3.3. An example answer, e.g. Category: News\n Reasoning: Becase ...
    4. The document to work with
    5. Reiteration of the task, e.g. Remember, you have to classify the document into one of the provided categories, do not generate new categories!

    Consequently, we have the following building blocks:
    <task_description>
    <task_data>
    <answer_instruction>
    <answer_template>
    <answer_example>
    <document>
    <task_reiteration>
    """

    supported_languages = ["en", "de"]
    system_prompt_templates = {
        "en": en_system_prompt_template.strip(),
        "de": de_system_prompt_template.strip(),
    }

    def __init__(
        self,
        db: Session,
        project_id: int,
        is_fewshot: bool,
        valid_data_tags: list[DataTag] = [DataTag.DOCUMENT],
        # either prompt templates are provided
        prompt_templates: list[LLMPromptTemplates] | None = None,
        # or the parameters to build them
        params: DocumentBasedTaskParams | None = None,
        example_ids: list[int] | None = None,
    ):
        project = crud_project.read(db=db, id=project_id)
        self.project_title = project.title
        self.project_description = project.description
        self.is_fewshot = is_fewshot

        # if no prompt templates are provided, create the default ones
        if prompt_templates is None:
            if params is None or example_ids is None:
                raise ValueError(
                    "Either prompt_templates or params and example_ids must be provided!"
                )
            prompt_templates = self._build_prompt_templates(
                params=params, example_ids=example_ids
            )

        # valid_data_tags are the placeholders, one of which must must be present in the user prompt template and will be replaced accordingly
        self.valid_data_tags = valid_data_tags
        self.lang2prompt_templates = {p.language: p for p in prompt_templates}

        # validate provided prompts
        is_valid, data_tag, err_msg = self._check_prompt_templates()
        if not is_valid:
            raise ValueError(f"Provided prompts are not valid: {err_msg}")

        # the data tag that is used in the user prompt templates (e.g. "<document>" or "<sentence>")
        assert data_tag is not None, "Data tag must not be None!"
        self.data_tag = data_tag

    # VALIDATION

    def _is_system_prompt_valid(self, system_prompt: str) -> bool:
        return True

    def _is_user_prompt_valid(self, user_prompt: str) -> bool:
        for tag in self.valid_data_tags:
            if tag.value in user_prompt:
                return True
        return False

    def _extract_data_tag(self, user_prompt: str) -> DataTag | None:
        for tag in self.valid_data_tags:
            if tag.value in user_prompt:
                return tag
        return None

    def _check_prompt_templates(self) -> tuple[bool, DataTag | None, str]:
        for language in self.supported_languages:
            if language not in self.lang2prompt_templates:
                return False, None, f"No prompts provided for language '{language}'!"
            prompts = self.lang2prompt_templates[language]
            if self._is_system_prompt_valid(prompts.system_prompt) is False:
                return False, None, f"Invalid system prompt for language '{language}'!"
            if self._is_user_prompt_valid(prompts.user_prompt) is False:
                return False, None, f"Invalid user prompt for language '{language}'!"

        # determine which data tag is used
        # and validate that the same tag is used in all languages
        data_tags = [
            self._extract_data_tag(self.lang2prompt_templates[lang].user_prompt)
            for lang in self.supported_languages
        ]
        if None in data_tags:
            return (
                False,
                None,
                f"No valid data tag found in user prompt! Valid tags are {self.valid_data_tags}",
            )
        if len(set(data_tags)) > 1:
            return (
                False,
                None,
                f"Different data tags ({set(data_tags)}) used in different languages!",
            )
        return True, data_tags[0], ""

    # PROMPT BUILDING

    def _build_system_prompt(self, language: str) -> str:
        if language not in self.supported_languages:
            raise ValueError("Language not supported")

        system_prompt = self.lang2prompt_templates[language].system_prompt.replace(
            "<project_title>", self.project_title
        )
        return system_prompt.replace("<project_description>", self.project_description)

    def _build_user_prompt(self, language: str, data: str) -> str:
        if language not in self.supported_languages:
            raise ValueError("Language not supported")

        user_prompt_template = self.lang2prompt_templates[language].user_prompt
        return user_prompt_template.replace(self.data_tag.value, data)

    def build_prompt(
        self, language: str, sdoc_data: SourceDocumentDataORM
    ) -> list[LLMMessage]:
        match self.data_tag:
            case DataTag.DOCUMENT:
                datas = [sdoc_data.content]
            case DataTag.SENTENCE:
                datas = sdoc_data.sentences
            case _:
                raise ValueError(f"Data tag {self.data_tag} not supported!")  # type: ignore

        messages: list[LLMMessage] = []
        system_prompt = self._build_system_prompt(language)
        for data in datas:
            user_prompt = self._build_user_prompt(
                language=language,
                data=data,
            )
            messages.append(
                LLMMessage(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                )
            )

        return messages

    # PROMPT TEMPLATE BUILDING

    def _build_system_prompt_template(self, language: str) -> str:
        return self.system_prompt_templates[language]

    def _build_user_prompt_template(
        self,
        *,
        language: str,
        example_ids: list[int] | None = None,
        params: DocumentBasedTaskParams,
    ) -> str:
        raise NotImplementedError()

    def _build_prompt_templates(
        self, params: DocumentBasedTaskParams, example_ids: list[int] | None = None
    ) -> list[LLMPromptTemplates]:
        if example_ids is not None and not self.is_fewshot:
            raise ValueError("Example IDs are only allowed for few-shot learning!")

        # create the prompt templates for all supported languages
        result: list[LLMPromptTemplates] = []
        for language in self.supported_languages:
            result.append(
                LLMPromptTemplates(
                    language=language,
                    system_prompt=self._build_system_prompt_template(language),
                    user_prompt=self._build_user_prompt_template(
                        language=language, example_ids=example_ids, params=params
                    ),
                )
            )
        return result

    # PARSING

    def parse_result(self, result: str):
        raise NotImplementedError()
