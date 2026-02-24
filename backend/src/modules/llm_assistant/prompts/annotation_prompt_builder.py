import random
import re
from collections import defaultdict
from typing import List

from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import conf
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.project.project_crud import crud_project
from modules.llm_assistant.llm_job_dto import AnnotationParams, LLMPromptTemplates
from modules.llm_assistant.prompts.prompt_builder import DataTag, PromptBuilder


class LLMHighlightedAnnotationResult(BaseModel):
    text: str
    reasoning: str | None = None


class LLMAnnotationResults(BaseModel):
    data: list[LLMHighlightedAnnotationResult]


lac = conf.llm_assistant

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

Text:
<sentence>
""".strip()

EN_FALLBACK_EXAMPLE = """
Example:
Input:
John lives in New York.

Output:
<PERSON>John</PERSON> lives in <LOCATION>New York</LOCATION>.
""".strip()

DE_FALLBACK_EXAMPLE = """
Beispiel:
Eingabe:
John lebt in New York.

Ausgabe:
<PERSON>John</PERSON> lebt in <LOCATION>New York</LOCATION>.
""".strip()


TAG_PATTERN = re.compile(
    r"<(?P<tag>[A-Z_]+)>(?P<text>.*?)</(?P=tag)>",
    re.DOTALL,
)


def _find_sentences_for_span(
    sdoc: SourceDocumentDataORM,
    begin: int,
    end: int,
) -> list[tuple[int, int]]:
    """
    Returns all (sentence_start, sentence_end) pairs
    that overlap with the span.
    """
    result = []

    for s_start, s_end in zip(sdoc.sentence_starts, sdoc.sentence_ends):
        if s_start < end and s_end > begin:
            result.append((s_start, s_end))

    return result


def _render_sentence_example_multi(
    sdoc: SourceDocumentDataORM,
    begin: int,
    end: int,
    tag: str,
) -> str:
    sent_offsets = _find_sentences_for_span(sdoc, begin, end)
    rendered_sentences = []

    for sent_start, sent_end in sent_offsets:
        sentence = sdoc.content[sent_start:sent_end]

        # compute span overlap with this sentence
        rel_begin = max(begin, sent_start) - sent_start
        rel_end = min(end, sent_end) - sent_start
        rendered = (
            sentence[:rel_begin]
            + f"<{tag}>"
            + sentence[rel_begin:rel_end]
            + f"</{tag}>"
            + sentence[rel_end:]
        )
        rendered_sentences.append(rendered)

    return " ".join(rendered_sentences)


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
        self.db = db
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

        examples_block = ""

        if self.is_fewshot:
            from core.annotation.span_annotation_crud import crud_span_anno
            from core.doc.source_document_crud import crud_sdoc
            from core.user.user_crud import SYSTEM_USER_IDS

            # fetch annotations
            if example_ids is None:
                annotations = [
                    a
                    for a in crud_span_anno.read_by_codes(
                        db=self.db, code_ids=params.code_ids
                    )
                    if a.user_id not in SYSTEM_USER_IDS
                ]
            else:
                annotations = crud_span_anno.read_by_ids(db=self.db, ids=example_ids)

            code_id2annos: dict[int, list[SpanAnnotationORM]] = defaultdict(list)
            for anno in annotations:
                code_id2annos[anno.code_id].append(anno)

            # sample examples
            threshold = lac.span_annotation.few_shot_threshold
            if example_ids is None:
                for cid, annos in code_id2annos.items():
                    assert len(annos) >= threshold, (
                        f"Code {cid} has less than {threshold} annotations!"
                    )
                    code_id2annos[cid] = random.sample(annos, threshold)

            # load documents
            sdoc_ids = {a.sdoc_id for a in annotations}
            sdoc_id2data = {
                d.id: d
                for d in crud_sdoc.read_data_batch(db=self.db, ids=list(sdoc_ids))
                if d is not None
            }

            # build example text
            example_blocks = []
            for cid, annos in code_id2annos.items():
                tag = self.codeids2code_dict[cid].name.upper()

                rendered = []
                for a in annos:
                    sdoc = sdoc_id2data[a.sdoc_id]

                    rendered.append(
                        _render_sentence_example_multi(
                            sdoc=sdoc,
                            begin=a.begin,
                            end=a.end,
                            tag=tag,
                        )
                    )

                example_blocks.append(
                    f"{tag} examples:\n" + "\n".join(f"- {r}" for r in rendered)
                )
                examples_block = "\n\nExamples:\n" + "\n\n".join(example_blocks)
        else:
            examples_block = "\n\n" + (
                EN_FALLBACK_EXAMPLE if language == "en" else DE_FALLBACK_EXAMPLE
            )

        return (
            self.prompt_templates[language].format(
                tags=tags, tag_definitions=tag_definitions
            )
            + examples_block
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
