from sqlalchemy.orm import Session

from core.project.project_crud import crud_project
from modules.llm_assistant.llm_assistant_enum import PromptPlaceholder
from modules.llm_assistant.llm_assistant_exceptions import InvalidCodeDefinitionsError
from modules.llm_assistant.llm_assistant_job_dto import (
    CodeBasedTaskParams,
    CodeDefinition,
    LLMAssistantPromptTemplates,
)
from modules.llm_assistant.strategies.llm_assistant_strategy import (
    LLMAssistantStrategy,
    StrategyParamsT,
)

# headers of the two-part "<codes>" block of the span annotation strategies
ALLOWED_CODES_HEADERS = {
    "en": ("Allowed codes:", "Code definitions:"),
    "de": ("Erlaubte Codes:", "Code-Definitionen:"),
}


class CodeAnnotationStrategy(LLMAssistantStrategy[StrategyParamsT]):
    """Base class of the strategies that annotate documents with codes.

    The code definitions (id, name, description) are data: they come from the
    task parameters (e.g. experiment-scoped drafts) or, by default, from the
    project's current codes. The user prompt references them with the
    "<codes>" placeholder, which ``_render_definitions`` fills in the format of
    the concrete strategy. LLM answers are mapped back to code ids by the
    (case-insensitive) names of these definitions.
    """

    definitions_placeholder = PromptPlaceholder.CODES

    def __init__(
        self,
        db: Session,
        project_id: int,
        is_fewshot: bool,
        params: CodeBasedTaskParams,
        prompt_templates: list[LLMAssistantPromptTemplates] | None = None,
        example_ids: list[int] | None = None,
    ):
        self.db = db
        self.code_definitions = self._resolve_code_definitions(
            db=db, project_id=project_id, params=params
        )
        self.codeid2definition = {
            definition.id: definition for definition in self.code_definitions
        }
        self.codename2id = {
            self._normalize_code_name(definition.name): definition.id
            for definition in self.code_definitions
        }

        super().__init__(
            db=db,
            project_id=project_id,
            is_fewshot=is_fewshot,
            params=params,
            prompt_templates=prompt_templates,
            example_ids=example_ids,
        )

    @staticmethod
    def _normalize_code_name(name: str) -> str:
        """Normalize a code name for case-insensitive matching of LLM answers."""
        return name.strip().upper()

    def _resolve_code_definitions(
        self, *, db: Session, project_id: int, params: CodeBasedTaskParams
    ) -> list[CodeDefinition]:
        """Return the definitions of the selected codes, in the order of code_ids.

        Raises:
            InvalidCodeDefinitionsError: If a selected code does not belong to the
                project, or the given definitions do not match the selected codes.
        """
        project_codes = {
            code.id: code for code in crud_project.read(db=db, id=project_id).codes
        }
        foreign_code_ids = [
            code_id for code_id in params.code_ids if code_id not in project_codes
        ]
        if foreign_code_ids:
            raise InvalidCodeDefinitionsError(
                f"The codes {foreign_code_ids} do not belong to project {project_id}."
            )
        if len(set(params.code_ids)) != len(params.code_ids):
            raise InvalidCodeDefinitionsError("The code IDs contain duplicates.")

        if params.code_definitions is None:
            return [
                CodeDefinition(
                    id=code_id,
                    name=project_codes[code_id].name,
                    description=project_codes[code_id].description or "",
                )
                for code_id in params.code_ids
            ]

        id2definition = {
            definition.id: definition for definition in params.code_definitions
        }
        if len(id2definition) != len(params.code_definitions) or set(
            id2definition
        ) != set(params.code_ids):
            raise InvalidCodeDefinitionsError(
                "Provide exactly one definition for each selected code."
            )
        normalized_names = [
            self._normalize_code_name(definition.name)
            for definition in params.code_definitions
        ]
        if "" in normalized_names:
            raise InvalidCodeDefinitionsError("Code names must not be blank.")
        if len(set(normalized_names)) != len(normalized_names):
            raise InvalidCodeDefinitionsError(
                "Code names must be unique (case-insensitive)."
            )
        return [id2definition[code_id] for code_id in params.code_ids]

    def _render_code_definition(self, definition: CodeDefinition) -> str:
        """Render one code definition as a line of the "<codes>" block."""
        return f"{definition.name}: {definition.description}"

    def _render_definitions(self, language: str) -> str:
        return self._render_definitions_lines()

    def _render_allowed_codes_block(self, language: str) -> str:
        """Render the upper-case code names, then one definition line per code."""
        codes_header, definitions_header = ALLOWED_CODES_HEADERS[language]
        code_names = ", ".join(
            definition.name.upper() for definition in self.code_definitions
        )
        return (
            f"{codes_header}\n{code_names}\n\n{definitions_header}\n"
            + self._render_definitions_lines()
        )

    def _render_definitions_lines(self) -> str:
        return "\n".join(
            self._render_code_definition(definition)
            for definition in self.code_definitions
        )

    def _code_name(self, code_id: int) -> str:
        """Return the name of a selected code as the LLM sees it."""
        return self.codeid2definition[code_id].name

    def _code_id_for_name(self, name: str) -> int | None:
        """Map a code name answered by the LLM to the id of a selected code."""
        return self.codename2id.get(self._normalize_code_name(name))
