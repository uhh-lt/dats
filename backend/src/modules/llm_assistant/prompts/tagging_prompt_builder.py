from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.project.project_crud import crud_project
from modules.llm_assistant.prompts.prompt_builder import PromptBuilder


class LLMParsedTaggingResult(BaseModel):
    tag_ids: list[int]
    reasoning: str


class LLMTaggingResult(BaseModel):
    categories: list[str]
    reasoning: str


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

Remember, you MUST classify the document using the provided categories, do not generate new categories!
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

    def __init__(self, db: Session, project_id: int, is_fewshot: bool):
        super().__init__(db, project_id, is_fewshot)

        project = crud_project.read(db=db, id=project_id)
        self.tags = project.tags
        self.tagid2tag = {tag.id: tag for tag in self.tags}
        self.tagname2id_dict = {tag.name.lower(): tag.id for tag in self.tags}

    def _build_example(self, language: str, tag_id: int) -> str:
        tag = self.tagid2tag[tag_id]

        return self.example_templates[language].format(tag.name, tag.name)

    def _build_user_prompt_template(
        self, *, language: str, tag_ids: list[int], **kwargs
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

    def parse_result(self, result: LLMTaggingResult) -> LLMParsedTaggingResult:
        return LLMParsedTaggingResult(
            tag_ids=[
                self.tagname2id_dict[category.lower()]
                for category in result.categories
                if category.lower() in self.tagname2id_dict
            ],
            reasoning=result.reasoning,
        )
