import json
from typing import Any, List, Optional

from loguru import logger
from pydantic import BaseModel, Field, create_model
from sqlalchemy.orm import Session

from common.meta_type import MetaType
from core.metadata.project_metadata_dto import ProjectMetadataRead
from core.project.project_crud import crud_project
from modules.llm_assistant.llm_job_dto import (
    LLMPromptTemplates,
    MetadataExtractionParams,
)
from modules.llm_assistant.prompts.prompt_builder import DataTag, PromptBuilder

# ENGLISH

en_prompt_template = """
Please extract the following information from the provided document. It is possible that not all information is contained in the document:
{}.

Please answer in this format. If the information is not contained in the document, skip the field:
{}

e.g.
{}

Document:
<document>

Remember, you MUST extract the information verbatim from the document, do not generate facts!

Lets think step by step.
"""

# GERMAN

de_prompt_template = """
Bitte extrahiere die folgenden Informationen aus dem Dokument. Es kann sein, dass nicht alle Informationen im Dokument enthalten sind:
{}.

Bitte anworte in diesem Format. Wenn die Information nicht im Dokument enthalten ist, überspringe das Feld:
{}

e.g.
{}

Dokument:
<document>

Denke daran, die Informationen MÜSSEN wörtlich aus dem Dokument extrahiert werden, generiere keine Fakten!

Lass uns Schritt für Schritt denken.
"""

example_template = """
{}: {}
"""


class MetadataPromptBuilder(PromptBuilder):
    supported_languages = ["en", "de"]
    prompt_templates = {
        "en": en_prompt_template.strip(),
        "de": de_prompt_template.strip(),
    }

    def __init__(
        self,
        db: Session,
        project_id: int,
        is_fewshot: bool,
        #  either prompt templates are provided
        prompt_templates: list[LLMPromptTemplates] | None = None,
        #  or parameters to build them
        params: MetadataExtractionParams | None = None,
        example_ids: list[int] | None = None,
    ):
        project = crud_project.read(db=db, id=project_id)
        self.project_metadata = [
            ProjectMetadataRead.model_validate(pm) for pm in project.metadata_
        ]
        self.metadataid2metadata = {
            metadata.id: metadata for metadata in self.project_metadata
        }
        self.metadataname2metadata = {
            metadata.key.lower(): metadata for metadata in self.project_metadata
        }
        if params:
            self.output_model = self._generate_dynamic_model(
                params.project_metadata_ids
            )
            logger.info(
                "Generated Dynamic Model Schema: \n{}",
                json.dumps(self.output_model.model_json_schema(), indent=2),
            )
        super().__init__(
            db,
            project_id,
            is_fewshot=is_fewshot,
            valid_data_tags=[DataTag.DOCUMENT],
            prompt_templates=prompt_templates,
            params=params,
            example_ids=example_ids,
        )

    def _generate_dynamic_model(self, project_metadata_ids: list[int]):
        """
        Creates a Pydantic model where each key is a metadata field.
        """
        # map metaType to Python types
        type_mapping = {
            MetaType.STRING: str,
            MetaType.NUMBER: int,
            MetaType.DATE: str,
            MetaType.BOOLEAN: bool,
            MetaType.LIST: List[str],
        }

        fields = {}
        for pmid in project_metadata_ids:
            metadata = self.metadataid2metadata[pmid]
            py_type = type_mapping.get(metadata.metatype, str)

            # define the field
            fields[metadata.key] = (
                Optional[py_type],
                Field(description=metadata.description),
            )

        return create_model("DynamicMetadataExtraction", **fields, __base__=BaseModel)

    def _build_answer_template(self, project_metadata_ids: list[int]) -> str:
        # The example will be a list of metadata keys and some example values
        answer_templates: dict[MetaType, str] = {
            MetaType.STRING: "<extracted text>",
            MetaType.NUMBER: "<number without commas, e.g., 1250>",  # Explicit rule
            MetaType.DATE: "<YYYY-MM-DD>",  # Format rule
            MetaType.BOOLEAN: "<True/False>",
            MetaType.LIST: "<item1, item2, item3>",
        }

        return (
            "{\n"
            + ",\n".join(
                [
                    example_template.format(
                        self.metadataid2metadata[pmid].key,
                        answer_templates[self.metadataid2metadata[pmid].metatype],
                    ).strip()
                    for pmid in project_metadata_ids
                ]
            )
            + "\n}"
        )

    def _build_example(self, project_metadata_ids: list[int]) -> str:
        # The example will be a list of metadata keys and some example values
        example_values: dict[MetaType, str] = {
            MetaType.STRING: "relevant information here",
            MetaType.NUMBER: "42",
            MetaType.DATE: "2024-01-01",
            MetaType.BOOLEAN: "True",
            MetaType.LIST: "info1, info2, info3",
        }
        return (
            "{\n"
            + ",\n".join(
                [
                    example_template.format(
                        self.metadataid2metadata[pmid].key,
                        example_values[self.metadataid2metadata[pmid].metatype],
                    ).strip()
                    for pmid in project_metadata_ids
                ]
            )
            + "\n}"
        )

    def _build_user_prompt_template(
        self,
        *,
        language: str,
        example_ids: list[int] | None = None,
        params: MetadataExtractionParams,
    ) -> str:
        task_data = "\n".join(
            [
                f"{self.metadataid2metadata[pmid].key} - {self.metadataid2metadata[pmid].description}"
                for pmid in params.project_metadata_ids
            ]
        )
        answer_template = self._build_answer_template(params.project_metadata_ids)
        answer_example = self._build_example(params.project_metadata_ids)
        return self.prompt_templates[language].format(
            task_data, answer_template, answer_example
        )

    def parse_result(self, result: BaseModel) -> dict[int, Any]:
        """
        Takes the validated dynamic model and maps field names back to metadata IDs.
        """
        extracted_data = result.model_dump(exclude_none=True)
        out_dict: dict[int, Any] = {}
        for key, value in extracted_data.items():
            metadata_name = key.lower()

            if metadata_name in self.metadataname2metadata:
                metadata_def = self.metadataname2metadata[metadata_name]
                out_dict[metadata_def.id] = value

        return out_dict
