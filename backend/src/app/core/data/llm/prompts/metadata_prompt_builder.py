import re
from typing import Dict, List

from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.llm.prompts.prompt_builder import PromptBuilder
from app.core.data.meta_type import MetaType

# ENGLISH

en_prompt_template = """
Please extract the following information from the provided document. It is possible that not all information is contained in the document:
{}.

Please answer in this format. If the information is not contained in the document, leave the field empty with "None":
{}

e.g.
{}

Document:
<document>

Remember, you MUST extract the information verbatim from the document, do not generate facts!
"""

# GERMAN

de_prompt_template = """
Bitte extrahiere die folgenden Informationen aus dem Dokument. Es kann sein, dass nicht alle Informationen im Dokument enthalten sind:
{}.

Bitte anworte in diesem Format. Wenn die Information nicht im Dokument enthalten ist, lasse das Feld leer mit "None":
{}

e.g.
{}

Dokument:
<document>

Denke daran, die Informationen MÜSSEN wörtlich aus dem Dokument extrahiert werden, generiere keine Fakten!
"""


class MetadataPromptBuilder(PromptBuilder):
    supported_languages = ["en", "de"]
    prompt_templates = {
        "en": en_prompt_template.strip(),
        "de": de_prompt_template.strip(),
    }

    def __init__(self, db: Session, project_id: int):
        super().__init__(db, project_id)

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

    def _build_answer_template(self, project_metadata_ids: List[int]) -> str:
        # The example will be a list of metadata keys and some example values
        answer_templates: Dict[MetaType, str] = {
            MetaType.STRING: "<extracted text>",
            MetaType.NUMBER: "<extracted number>",
            MetaType.DATE: "<extracted date>",
            MetaType.BOOLEAN: "<True/False>",
            MetaType.LIST: "<extracted info>, <extracted info>, ...",
        }

        return "\n".join(
            [
                f"{self.metadataid2metadata[pmid].key}: {answer_templates[self.metadataid2metadata[pmid].metatype]}"
                for pmid in project_metadata_ids
            ]
        )

    def _build_example(self, project_metadata_ids: List[int]) -> str:
        # The example will be a list of metadata keys and some example values
        example_values: Dict[MetaType, str] = {
            MetaType.STRING: "relevant information here",
            MetaType.NUMBER: "42",
            MetaType.DATE: "2024-01-01",
            MetaType.BOOLEAN: "True",
            MetaType.LIST: "info1, info2, info3",
        }

        return "\n".join(
            [
                f"{self.metadataid2metadata[pmid].key}: {example_values[self.metadataid2metadata[pmid].metatype]}"
                for pmid in project_metadata_ids
            ]
        )

    def _build_user_prompt_template(
        self, language: str, project_metadata_ids: List[int], **kwargs
    ) -> str:
        task_data = "\n".join(
            [
                f"{self.metadataid2metadata[pmid].key} - {self.metadataid2metadata[pmid].description}"
                for pmid in project_metadata_ids
            ]
        )
        answer_template = self._build_answer_template(project_metadata_ids)
        answer_example = self._build_example(project_metadata_ids)
        return self.prompt_templates[language].format(
            task_data, answer_template, answer_example
        )

    def parse_response(self, language: str, response: str) -> Dict[int, str]:
        components = re.split(r"\n+", response)

        results: Dict[int, str] = {}
        for component in components:
            if ":" not in component:
                continue

            # extract the key and value
            key, value = component.split(":", 1)

            # check if the key is valid
            if key.lower() not in self.metadataname2metadata:
                continue

            # get the metadata
            proj_metadata = self.metadataname2metadata[key.lower()]
            value = value.strip()

            results[proj_metadata.id] = value

        return results
