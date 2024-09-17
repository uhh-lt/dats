import re
from typing import List, Tuple

from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.llm.prompts.prompt_builder import PromptBuilder

# ENGLISH

en_prompt_template = """
Please classify the document into all appropriate categories below. Multiple or zero categories are possible:
{}.

Please answer in this format. The reasoning is optional.
Categories: <category 1>, <category 2>, ...
Reasoning: <reason>

e.g.
{}

Document:
<document>

Remember, you have to classify the document into using the provided categories, do not generate new categories!
"""

en_example_tempalate = """
Categories: {}
Reasoning: This document is about {}.
"""


# GERMAN

de_prompt_template = """
Bitte klassifiziere das Dokument in alle passenden folgenden Kategorien. Es sind mehrere oder keine Kategorien möglich:
{}.

Bitte anworte in diesem Format. Die Begründung ist optional.
Kategorien: <Kategorie 1>, <Kategorie 2>, ...
Begründung: <Begründung>

e.g.
{}

Dokument:
<document>

Denke daran, das Dokument MUSS mithilfe der gegebenen Kategorien klassifiziert werden, generiere keine neuen Kategorien!
"""

de_example_tempalate = """
Kategorien: {}
Begründung: Das Dokument handelt von {}.
"""


class TaggingPromptBuilder(PromptBuilder):
    prompt_templates = {
        "en": en_prompt_template.strip(),
        "de": de_prompt_template.strip(),
    }
    example_templates = {
        "en": en_example_tempalate.strip(),
        "de": de_example_tempalate.strip(),
    }
    category_word = {"en": "Categories:", "de": "Kategorien:"}
    reason_word = {"en": "Reasoning:", "de": "Begründung:"}

    def __init__(self, db: Session, project_id: int):
        super().__init__(db, project_id)

        project = crud_project.read(db=db, id=project_id)
        self.document_tags = project.document_tags
        self.tagid2tag = {tag.id: tag for tag in self.document_tags}
        self.tagname2id_dict = {tag.name.lower(): tag.id for tag in self.document_tags}

    def _build_example(self, language: str, tag_id: int) -> str:
        tag = self.tagid2tag[tag_id]

        return self.example_templates[language].format(tag.name, tag.name)

    def _build_user_prompt_template(
        self, language: str, tag_ids: List[int], **kwargs
    ) -> str:
        # create task data (the list of tags to use for classification)
        task_data = "\n".join(
            [
                f"{self.tagid2tag[tag_id].name} - {self.tagid2tag[tag_id].description}"
                for tag_id in tag_ids
            ]
        )

        # create answer example
        answer_example = self._build_example(language, tag_ids[0])

        return self.prompt_templates[language].format(task_data, answer_example)

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
            f"{self.reason_word[language]}"
        ):
            reason = components[1].split(":")[1].strip()

        return categories, reason
