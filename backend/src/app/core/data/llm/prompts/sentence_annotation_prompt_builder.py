import random
from typing import List

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.llm.prompts.prompt_builder import PromptBuilder


class OllamaParsedSentenceAnnotationResult(BaseModel):
    sent_id: int
    code_id: int


class OllamaSentenceAnnotationResult(BaseModel):
    sent_id: int
    category: str


class OllamaSentenceAnnotationResults(BaseModel):
    data: List[OllamaSentenceAnnotationResult]


# ENGLISH

en_prompt_template = """
Please classify each sentence the following document in one of the following categories:
{}.

Please answer in this format. Do not provide your reasoning. Only use the provided categories.
Sentence ID: <sentence number>
Category: <category>

e.g.
{}

This is the document, sentence by sentence:
<document>

Remember to provide a category for each sentence. You are NOT ALLOWED to use any other category than the ones provided.
"""

en_example_template = """
Sentence ID: {}
Category: {}
"""


# GERMAN

de_prompt_template = """
Bitte klassifiziere jeden Satz des folgenden Dokuments in eine der folgenden Kategorien:
{}.

Bitte anworte in diesem Format. Gebe keine Begründung an. Verwende nur die bereitgestellten Kategorien.
Satz ID: <Satz Nummer>
Kategorie: <Kategorie>

e.g.
{}

Dies ist das Dokument, Satz für Satz:
<document>

Denke daran, dass du für jeden Satz eine Kategorie angeben musst. Du darfst KEINE andere Kategorie als die bereitgestellten verwenden.
"""

de_example_template = """
Satz ID: {}
Kategorie: {}
"""


class SentenceAnnotationPromptBuilder(PromptBuilder):
    supported_languages = ["en", "de"]
    prompt_templates = {
        "en": en_prompt_template.strip(),
        "de": de_prompt_template.strip(),
    }
    example_templates = {
        "en": en_example_template.strip(),
        "de": de_example_template.strip(),
    }

    def __init__(self, db: Session, project_id: int):
        super().__init__(db, project_id)

        project = crud_project.read(db=db, id=project_id)
        self.codes = project.codes
        self.codename2id_dict = {code.name.lower(): code.id for code in self.codes}
        self.codeid2name_dict = {code.id: code.name for code in self.codes}
        self.codeids2code_dict = {code.id: code for code in self.codes}

    def _build_example(self, language: str, code_ids: List[int]) -> str:
        examples: List[str] = []
        for code_id in code_ids:
            if code_id not in self.codeid2name_dict:
                continue
            examples.append(self.codeid2name_dict[code_id])

        if len(examples) == 0:
            # choose 3 random examples
            examples.extend(random.sample(list(self.codeid2name_dict.values()), 3))

        examples = [
            self.example_templates[language].format(idx, example)
            for idx, example in enumerate(examples)
        ]

        return "\n".join(examples)

    def _build_user_prompt_template(
        self, language: str, code_ids: List[int], **kwargs
    ) -> str:
        task_data = "\n".join(
            [
                f"{self.codeids2code_dict[code_id].name}: {self.codeids2code_dict[code_id].description}"
                for code_id in code_ids
            ]
        )
        answer_example = self._build_example(language, code_ids)
        return self.prompt_templates[language].format(task_data, answer_example)

    def parse_result(
        self, result: OllamaSentenceAnnotationResults
    ) -> List[OllamaParsedSentenceAnnotationResult]:
        parsed_results = []
        for annotation in result.data:
            if annotation.category.lower() not in self.codename2id_dict:
                continue

            code_id = self.codename2id_dict[annotation.category.lower()]
            parsed_results.append(
                OllamaParsedSentenceAnnotationResult(
                    sent_id=annotation.sent_id, code_id=code_id
                )
            )
        return parsed_results
