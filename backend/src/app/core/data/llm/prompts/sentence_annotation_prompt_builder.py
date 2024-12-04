import random
import re
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.llm.prompts.prompt_builder import PromptBuilder

# ENGLISH

en_prompt_template = """
Please classify each sentence the following document in one of the following categories:
{}.

Please answer in this format. Do not provide reasoning or your thoughts. Only use the provided categories.
<sentence_number>: <category>
<sentence_number>: <category>

e.g.
{}

This is the document, sentence by sentence:
<document>

Remember to provide a category for each sentence. You are NOT ALLOWED to use any other category than the ones provided.
"""


# GERMAN

de_prompt_template = """
Bitte klassifiziere jeden Satz des folgenden Dokuments in eine der folgenden Kategorien:
{}.

Bitte anworte in diesem Format. Gebe keine Begründung oder Gedanken an. Verwende nur die bereitgestellten Kategorien.
<Satz Nummer>: <Kategorie>
<Satz Nummer>: <Kategorie>

e.g.
{}

Dies ist das Dokument, Satz für Satz:
<document>

Denke daran, dass du für jeden Satz eine Kategorie angeben musst. Du darfst KEINE andere Kategorie als die bereitgestellten verwenden.
"""


class SentenceAnnotationPromptBuilder(PromptBuilder):
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
        examples: Dict[int, str] = {}
        for code in project.codes:
            examples[code.id] = code.name
        self.examples = examples

    def _build_example(self, language: str, code_ids: List[int]) -> str:
        examples: List[str] = []
        for code_id in code_ids:
            if code_id not in self.examples:
                continue
            examples.append(self.examples[code_id])

        if len(examples) == 0:
            # choose 3 random examples
            examples.extend(random.sample(list(self.examples.values()), 3))

        # prepend sentence number
        examples = [f"{idx+1}: {example}" for idx, example in enumerate(examples)]

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

    def _parse_codeid(self, classification: str) -> Optional[int]:
        result = classification
        if " " in result:
            result = result.split(" ")[0]

        if "/" in result:
            result = result.split("/")[0]

        return self.codename2id_dict.get(result.lower(), None)

    def parse_response(self, language: str, response: str) -> Dict[int, int]:
        parsed_result = {}

        if "\n" in response:
            components = re.split(r"\n+", response)

            for component in components:
                if ":" in component:
                    try:
                        sentence_id = int(component.split(":")[0].strip())
                    except ValueError:
                        continue
                    classification = component.split(":")[1].strip()
                    code_id = self._parse_codeid(classification)
                    if code_id is not None:
                        parsed_result[sentence_id] = code_id
        else:
            if ":" in response:
                sentence_id = 1
                classification = response.split(":")[1].strip()
                code_id = self._parse_codeid(classification)
                if code_id is not None:
                    parsed_result = {sentence_id: code_id}

        return parsed_result
