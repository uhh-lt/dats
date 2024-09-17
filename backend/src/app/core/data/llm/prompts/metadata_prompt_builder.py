import random
import re
from typing import List, Tuple

from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.dto.llm_job import LLMPromptTemplates
from app.core.data.llm.prompts.prompt_builder import PromptBuilder

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
    prompt_templates = {"en": en_prompt_template, "de": de_prompt_template}

    def __init__(self, db: Session, project_id: int):
        super().__init__(db, project_id)

        project = crud_project.read(db=db, id=project_id)
        self.document_tags = project.document_tags
        self.tagname2id_dict = {tag.name.lower(): tag.id for tag in self.document_tags}

    def _build_example(self, language: str) -> str:
        # choose a random tag
        random_tag_id = random.randint(0, len(self.document_tags) - 1)
        tag = self.document_tags[random_tag_id]

        return self.example_templates[language].format(tag.name, tag.name)

    def build_prompt_templates(self, tag_ids: List[int]) -> List[LLMPromptTemplates]:
        # create task data (the list of tags to use for classification)
        task_data = "\n".join(
            [f"{tag.name} - {tag.description}" for tag in self.document_tags]
        )

        # create the prompt templates for all supported languages
        result: List[LLMPromptTemplates] = []
        for language in self.supported_languages:
            answer_example = self._build_example(language)

            prompt = self.prompt_templates[language].format(task_data, answer_example)

            result.append(
                LLMPromptTemplates(
                    language=language,
                    system_prompt="This is a system prompt",
                    user_prompt=prompt,
                )
            )
        return result

    def parse_response(self, language: str, response: str) -> Tuple[List[int], str]:
        if language not in self.category_word:
            return [], f"Language '{language}' is not supported."
        if language not in self.reason_word:
            return [], f"Language '{language}' is not supported."

        components = re.split(r"\n+", response)

        # check that the answer starts with expected category word
        if not components[0].startswith(f"{self.category_word[language]}"):
            return (
                [],
                f"The answer has to start with '{self.category_word[language]}'.",
            )

        # extract the categories
        comma_separated_categories = components[0].split(":")[1].strip()
        if len(comma_separated_categories) == 0:
            categories = []
        else:
            categories = [
                category.strip().lower()
                for category in comma_separated_categories.split(",")
            ]

        # map the categories to their tag ids
        categories = [
            self.tagname2id_dict[category]
            for category in categories
            if category in self.tagname2id_dict
        ]

        # extract the reason if the answer has multiple lines
        reason = "No reason was provided"
        if len(components) > 1 and components[1].startswith(
            f"{self.reason_word[language]}:"
        ):
            reason = components[1].split(":")[1].strip()

        return categories, reason
