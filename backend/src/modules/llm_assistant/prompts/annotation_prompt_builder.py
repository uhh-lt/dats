import re
from typing import List

from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.project.project_crud import crud_project
from modules.llm_assistant.llm_job_dto import AnnotationParams, LLMPromptTemplates
from modules.llm_assistant.prompts.prompt_builder import DataTag, PromptBuilder


class LLMHighlightedAnnotationResult(BaseModel):
    text: str
    reasoning: str | None = None


class LLMAnnotationResults(BaseModel):
    data: list[LLMHighlightedAnnotationResult]


EN_PROMPT_TEMPLATE = """
You are an assistant that performs token-level Named Entity Recognition (NER).

Allowed tags:
{tags}

Tag definitions:
{tag_definitions}

Rules:
- Return the original text with inline XML-style tags (e.g. <TAG>text</TAG>)
- Do NOT add or remove characters outside of tags
- Do NOT change whitespace or punctuation
- Tags must not overlap or nest
- Only use the allowed tags around the specific entities and not the entire sentence
- If no entity is present, return the text unchanged

Lets think step by step.

Example:
Input:
John lives in New York.

Output:
<PERSON>John</PERSON> lives in <LOCATION>New York</LOCATION>.

Text:
<sentence>
""".strip()


DE_PROMPT_TEMPLATE = """
Du bist ein Assistent für tokenbasierte Named Entity Recognition (NER).

Erlaubte Tags:
{tags}

Tag-Definitionen:
{tag_definitions}

Regeln:
- Gib den Originaltext mit Inline-XML-Tags zurück (z. B. <TAG>Text</TAG>)
- Füge außerhalb der Tags keine Zeichen hinzu und entferne keine
- Ändere keine Leerzeichen oder Satzzeichen
- Tags dürfen sich nicht überlappen oder verschachtelt sein
- Verwende nur die erlaubten Tags um die spezifischen Entitäten und nicht um den gesamten Satz
- Wenn keine Entität vorhanden ist, gib den Text unverändert zurück

Lass uns Schritt für Schritt denken.

Beispiel:
Eingabe:
John lebt in New York.

Ausgabe:
<PERSON>John</PERSON> lebt in <LOCATION>New York</LOCATION>.

Text:
<sentence>
""".strip()

TAG_PATTERN = re.compile(
    r"<(?P<tag>[A-Z_]+)>(?P<text>.*?)</(?P=tag)>",
    re.DOTALL,
)


class AnnotationPromptBuilder(PromptBuilder):
    supported_languages = ["en", "de"]
    prompt_templates = {
        "en": EN_PROMPT_TEMPLATE,
        "de": DE_PROMPT_TEMPLATE,
    }

    def __init__(
        self,
        db: Session,
        project_id: int,
        is_fewshot: bool,
        prompt_templates: List[LLMPromptTemplates] | None = None,
        params: AnnotationParams | None = None,
        example_ids: List[int] | None = None,
    ):
        project = crud_project.read(db=db, id=project_id)

        self.codes = project.codes
        self.codename2id_dict = {code.name.upper(): code.id for code in self.codes}
        self.codeids2code_dict = {code.id: code for code in self.codes}

        super().__init__(
            db=db,
            project_id=project_id,
            is_fewshot=is_fewshot,
            valid_data_tags=[DataTag.DOCUMENT, DataTag.SENTENCE],
            prompt_templates=prompt_templates,
            params=params,
            example_ids=example_ids,
        )

    def _build_user_prompt_template(
        self,
        *,
        language: str,
        example_ids: List[int] | None = None,
        params: AnnotationParams,
    ) -> str:
        tags = ", ".join(
            self.codeids2code_dict[cid].name.upper() for cid in params.code_ids
        )

        tag_definitions = "\n".join(
            f"{self.codeids2code_dict[cid].name.upper()}: "
            f"{self.codeids2code_dict[cid].description}"
            for cid in params.code_ids
        )

        return self.prompt_templates[language].format(
            tags=tags,
            tag_definitions=tag_definitions,
        )

    def parse_result(
        self,
        result: LLMHighlightedAnnotationResult,
    ):
        """
        Returns:
        - clean_text: str
        - spans: list of dicts with code_id, text, begin, end
        """
        clean_text = ""
        spans = []
        cursor = 0
        clean_cursor = 0
        highlighted = result.text
        for match in TAG_PATTERN.finditer(highlighted):
            before = highlighted[cursor : match.start()]
            clean_text += before
            clean_cursor += len(before)

            entity_text = match.group("text")
            tag = match.group("tag")
            if tag.upper() not in self.codename2id_dict:
                continue
            begin = clean_cursor
            end = begin + len(entity_text)

            spans.append(
                {
                    "code_id": self.codename2id_dict[tag.upper()],
                    "text": entity_text,
                    "begin": begin,
                    "end": end,
                }
            )

            clean_text += entity_text
            clean_cursor = end
            cursor = match.end()

        tail = highlighted[cursor:]
        clean_text += tail

        return clean_text, spans
