import random
import re
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.llm.prompts.prompt_builder import PromptBuilder

# ENGLISH

en_prompt_template = """
Please extract text passages from the provided document that are relevant to the following categories. The categories are:
{}.

Please answer in this format. Not every category may be present in the text. There can be multiple relevant passages per category:
<category 1>: <relevant text passage>
<category 1>: <relevant text passage>
<category 2>: <relevant text passage>

e.g.
{}

Document:
<document>

Remember, you have to extract text passages that are relevant to the categories verbatim, do not generate passages!
"""


# GERMAN

de_prompt_template = """
Bitte extrahiere Textpassagen aus dem gegebenen Dokument, die gut zu den folgenden Kategorien passen. Die Kategorien sind:
{}.

Bitte anworte in diesem Format. Nicht alle Kategorien müssen im Text vorkommen. Es können mehrere Textpassagen pro Kategorie relevant sein:
<Kategorie 1>: <relevante Textpassage>
<Kategorie 1>: <relevante Textpassage>
<Kategorie 2>: <relevante Textpassage>

e.g.
{}

Dokument:
<document>

Denke daran, dass du Textpassagen wörtlich extrahieren musst, die zu den Kategorien passen. Generiere keine neuen Textpassagen!
"""


class AnnotationPromptBuilder(PromptBuilder):
    supported_languages = ["en", "de"]
    prompt_templates = {
        "en": en_prompt_template.strip(),
        "de": de_prompt_template.strip(),
    }

    def __init__(self, db: Session, project_id: int):
        super().__init__(db, project_id)

        project = crud_project.read(db=db, id=project_id)
        self.codes = project.codes
        self.codename2id_dict = {code.name.lower(): code.id for code in self.codes}
        self.codeids2code_dict = {code.id: code for code in self.codes}

        # get one example annotation per code
        examples: Dict[int, Optional[str]] = {}
        for code in project.codes:
            # get all annotations for the code
            annotations = code.current_code.span_annotations
            if len(annotations) == 0:
                continue
            random_annotation = random.choice(annotations)
            examples[code.id] = random_annotation.span_text.text
        self.examples = examples

    def _build_example(self, language: str, code_ids: List[int]) -> str:
        examples: List[str] = []
        for code_id in code_ids:
            if code_id not in self.examples:
                continue
            examples.append(
                f"{self.codeids2code_dict[code_id].name}: {self.examples[code_id]}"
            )

        if len(examples) == 0:
            # choose 3 random examples
            for code_id in random.sample(list(self.codeids2code_dict.keys()), 3):
                examples.append(
                    f"{self.codeids2code_dict[code_id].name}: {self.examples[code_id]}"
                )

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

    def parse_response(self, language: str, response: str) -> List[Tuple[int, str]]:
        components = re.split(r"\n+", response)

        results: List[Tuple[int, str]] = []
        for component in components:
            if ":" not in component:
                continue

            # extract the code_name and value
            code_name, value = component.split(":", 1)

            # check if the code_name is valid
            if code_name.lower() not in self.codename2id_dict:
                continue

            # get the code
            code_id = self.codename2id_dict[code_name.lower()]
            value = value.strip()

            results.append((code_id, value))

        return results
