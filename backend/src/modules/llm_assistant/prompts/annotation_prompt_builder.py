import random

from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.project.project_crud import crud_project
from modules.llm_assistant.prompts.prompt_builder import PromptBuilder


class LLMParsedAnnotationResult(BaseModel):
    code_id: int
    text: str


class LLMAnnotationResult(BaseModel):
    category: str
    text: str


class LLMAnnotationResults(BaseModel):
    data: list[LLMAnnotationResult]


# ENGLISH

en_prompt_template = """
Please extract text passages from the provided document that are relevant to the following categories:
{}.

Please answer in this format. Not every category may be present in the text. There can be multiple relevant passages per category:
Category: <category 1>
Text: <relevant text passage>

e.g.
{}

Document:
<document>

Remember, you have to extract text passages that are relevant to the categories verbatim, do not generate passages!
"""

en_example_template = """
Category: {}
Text: {}
"""

# GERMAN

de_prompt_template = """
Bitte extrahiere Textpassagen aus dem gegebenen Dokument, die gut zu den folgenden Kategorien passen:
{}.

Bitte anworte in diesem Format. Nicht alle Kategorien müssen im Text vorkommen. Es können mehrere Textpassagen pro Kategorie relevant sein:
Kategorie: <Kategorie 1>
Text: <relevante Textpassage>

e.g.
{}

Dokument:
<document>

Denke daran, dass du Textpassagen wörtlich extrahieren musst, die zu den Kategorien passen. Generiere keine neuen Textpassagen!
"""

de_example_template = """
Kategorie: {}
Text: {}
"""


class AnnotationPromptBuilder(PromptBuilder):
    supported_languages = ["en", "de"]
    prompt_templates = {
        "en": en_prompt_template.strip(),
        "de": de_prompt_template.strip(),
    }
    example_templates = {
        "en": en_example_template.strip(),
        "de": de_example_template.strip(),
    }

    def __init__(self, db: Session, project_id: int, is_fewshot: bool):
        super().__init__(db, project_id, is_fewshot=is_fewshot)

        project = crud_project.read(db=db, id=project_id)
        self.codes = project.codes
        self.codename2id_dict = {code.name.lower(): code.id for code in self.codes}
        self.codeids2code_dict = {code.id: code for code in self.codes}

        # get one example annotation per code
        examples: dict[str, dict[int, str]] = {
            "en": {},
            "de": {},
        }
        for code in project.codes:
            # get all annotations for the code
            annotations = code.span_annotations
            if len(annotations) == 0:
                continue
            random_annotation = random.choice(annotations)
            for lang in ["en", "de"]:
                examples[lang][code.id] = self.example_templates[lang].format(
                    code.name, random_annotation.span_text.text
                )
        self.examples = examples

    def _build_example(self, language: str, code_ids: list[int]) -> str:
        examples: list[str] = []
        for code_id in code_ids:
            if code_id not in self.examples:
                continue
            examples.append(self.examples[language][code_id])

        if len(examples) == 0:
            # choose 3 random examples
            examples.extend(random.sample(list(self.examples[language].values()), 3))

        return "\n".join(examples)

    def _build_user_prompt_template(
        self, *, language: str, code_ids: list[int], **kwargs
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
        self, result: LLMAnnotationResults
    ) -> list[LLMParsedAnnotationResult]:
        parsed_results = []
        for annotation in result.data:
            if annotation.category.lower() not in self.codename2id_dict:
                continue

            code_id = self.codename2id_dict[annotation.category.lower()]
            parsed_results.append(
                LLMParsedAnnotationResult(code_id=code_id, text=annotation.text)
            )

        return parsed_results
