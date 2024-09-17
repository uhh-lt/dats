import random
import re
from typing import List, Tuple

from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.dto.llm_job import LLMPromptTemplates
from app.core.data.llm.prompts.prompt_builder import PromptBuilder

# ENGLISH

en_prompt_template = """
Please extract text passages from the provided document that are relevant to the following categories. The categories are:
{}.

Please answer in this format. There can be multiple relevant passages per category:
{}

e.g.
{}

Document:
<document>

Remember, you have to extract text passages that are relevant to the categories, do not generate passages!
"""


# GERMAN

de_prompt_template = """
Bitte extrahiere Textpassagen aus dem gegebenen Dokument, die gut zu den folgenden Kategorien passen. Die Kategorien sind:
{}.

Bitte anworte in diesem Format. Es können mehrere Textpassagen pro Kategorie relevant sein:
{}

e.g.
{}

Dokument:
<document>

Denke daran, dass du Textpassagen wörtlich extrahieren musst, die zu den Kategorien passen. Generiere keine neuen Textpassagen!
"""


class AnnotationPromptBuilder(PromptBuilder):
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
