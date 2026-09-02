import random
import re
from collections import defaultdict

from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import conf
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.project.project_crud import crud_project
from modules.llm_assistant.llm_job_dto import (
    AnnotationParams,
    LLMPromptTemplates,
    NERInlineTagStrategyParams,
    StrategyType,
)
from modules.llm_assistant.prompts.data_tag import DataTag
from modules.llm_assistant.strategies.llm_strategy import LLMStrategy
from modules.llm_assistant.strategies.types.parsed_span import ParsedSpan


class LLMHighlightedAnnotationResult(BaseModel):
    text: str
    reasoning: str | None = None


class LLMAnnotationResults(BaseModel):
    data: list[LLMHighlightedAnnotationResult]


lac = conf.llm_assistant

EN_PROMPT_TEMPLATE = """
You are an assistant that identifies and classifies relevant text passages.

Allowed codes:
{codes}

Code definitions:
{code_definitions}

Rules:
- Return the original text with inline XML-style tags (e.g. <CODE>text</CODE>)
- Do NOT add or remove characters outside of tags
- Do NOT change whitespace or punctuation
- Codes must not overlap or nest
- Wrap only the text passages that are relevant to an allowed code; do not include unrelated surrounding text
- If no relevant text that fits the codes is present, return the text unchanged

Lets think step by step.

Text:
<sentence>
""".strip()


DE_PROMPT_TEMPLATE = """
Du bist ein Assistent, der relevante Textpassagen identifiziert und klassifiziert.

Erlaubte Codes:
{codes}

Code-Definitionen:
{code_definitions}

Regeln:
- Gib den Originaltext mit Inline-XML-Tags zurück (z. B. <CODE>Text</CODE>)
- Füge außerhalb der Tags keine Zeichen hinzu und entferne keine
- Ändere keine Leerzeichen oder Satzzeichen
- Annotationen dürfen sich nicht überlappen oder verschachtelt sein
- Umschließe nur Textpassagen, die für einen erlaubten Code relevant sind; schließe keinen irrelevanten umgebenden Text ein
- Wenn keine Textpassage passend zu den Codes ist, gib den Text unverändert zurück

Lass uns Schritt für Schritt denken.

Text:
<sentence>
""".strip()

EN_FALLBACK_EXAMPLE = """
Example:
Input:
The survey results support the proposal.

Output:
The <EVIDENCE>survey results</EVIDENCE> support the proposal.
""".strip()

DE_FALLBACK_EXAMPLE = """
Beispiel:
Eingabe:
Die Umfrageergebnisse stützen den Vorschlag.

Ausgabe:
Die <BELEG>Umfrageergebnisse</BELEG> stützen den Vorschlag.
""".strip()


CODE_PATTERN = re.compile(
    r"<(?P<code>[A-Z_]+)>(?P<text>.*?)</(?P=code)>",
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
    code: str,
) -> str:
    """Render the annotated sentences overlapping a span as an inline-tag example."""
    sent_offsets = _find_sentences_for_span(sdoc, begin, end)
    rendered_sentences = []

    for sent_start, sent_end in sent_offsets:
        sentence = sdoc.content[sent_start:sent_end]

        # compute span overlap with this sentence
        rel_begin = max(begin, sent_start) - sent_start
        rel_end = min(end, sent_end) - sent_start
        rendered = (
            sentence[:rel_begin]
            + f"<{code}>"
            + sentence[rel_begin:rel_end]
            + f"</{code}>"
            + sentence[rel_end:]
        )
        rendered_sentences.append(rendered)

    return " ".join(rendered_sentences)


class NERInlineTagStrategy(LLMStrategy[NERInlineTagStrategyParams]):
    """Span annotation via inline XML-style tags.

    The LLM repeats the original text and wraps relevant text passages in inline
    tags like ``<EVIDENCE>survey results</EVIDENCE>``. Parsing depends on those tags.
    """

    strategy_type = StrategyType.NER_INLINE_TAGS
    display_name = "Inline Tagging"
    description = (
        "The LLM repeats the original text and wraps relevant text passages in "
        "inline tags.\n"
        "\n"
        "**How it works:** The LLM receives the full document (or individual sentences) "
        "and is asked to repeat the text verbatim, wrapping each relevant passage in "
        "XML-like tags. The tag name is the code name.\n"
        "\n"
        "**Example:** Given the code `Evidence` and the input text:\n"
        "\n"
        "    The survey results support the proposal.\n"
        "\n"
        "The LLM responds with:\n"
        "\n"
        "    The <EVIDENCE>survey results</EVIDENCE> support the proposal.\n"
        "\n"
        "The backend then parses these tags to compute exact character offsets.\n"
        "\n"
        "**When to use:** Best for shorter documents where the LLM can reliably "
        "reproduce the full text. Supports whole-document and sentence-by-sentence modes."
    )
    strategy_params_type = NERInlineTagStrategyParams
    allowed_data_tags = [DataTag.DOCUMENT.value, DataTag.SENTENCE.value]

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
        prompt_templates: list[LLMPromptTemplates] | None = None,
        params: AnnotationParams | None = None,
        example_ids: list[int] | None = None,
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

    def get_response_model(self) -> type[LLMHighlightedAnnotationResult]:
        return LLMHighlightedAnnotationResult

    def _build_user_prompt_template(
        self,
        *,
        language: str,
        example_ids: list[int] | None = None,
        params: AnnotationParams,
    ) -> str:
        codes = ", ".join(
            self.codeids2code_dict[cid].name.upper() for cid in params.code_ids
        )

        code_definitions = "\n".join(
            f"{self.codeids2code_dict[cid].name.upper()}: "
            f"{self.codeids2code_dict[cid].description}"
            for cid in params.code_ids
        )

        examples_block = ""

        if self.is_fewshot:
            from core.annotation.span_annotation_crud import crud_span_anno
            from core.doc.source_document_data_crud import crud_sdoc_data
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
            threshold = lac.few_shot_threshold
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
                for d in crud_sdoc_data.read_by_ids(db=self.db, ids=list(sdoc_ids))
                if d is not None
            }

            # build example text
            example_blocks = []
            for cid, annos in code_id2annos.items():
                code = self.codeids2code_dict[cid].name.upper()

                rendered = []
                for a in annos:
                    sdoc = sdoc_id2data[a.sdoc_id]

                    rendered.append(
                        _render_sentence_example_multi(
                            sdoc=sdoc,
                            begin=a.begin,
                            end=a.end,
                            code=code,
                        )
                    )

                example_blocks.append(
                    f"{code} examples:\n" + "\n".join(f"- {r}" for r in rendered)
                )
                examples_block = "\n\nExamples:\n" + "\n\n".join(example_blocks)
        else:
            examples_block = "\n\n" + (
                EN_FALLBACK_EXAMPLE if language == "en" else DE_FALLBACK_EXAMPLE
            )

        return (
            self.prompt_templates[language].format(
                codes=codes, code_definitions=code_definitions
            )
            + examples_block
        )

    def parse_result(
        self,
        result: LLMHighlightedAnnotationResult,
        sdoc_data: SourceDocumentDataORM,
        message_id: int,
    ) -> list[ParsedSpan]:
        # determine the start offset for this message
        match self.data_tag:
            case DataTag.SENTENCE:
                start_offset = sdoc_data.sentence_starts[message_id]
            case DataTag.DOCUMENT:
                start_offset = 0
            case _:
                raise ValueError(f"Unknown DataTag: {self.data_tag}")  # type: ignore

        clean_text = ""
        spans: list[ParsedSpan] = []

        # Tracks our position in the ORIGINAL string so we can slice out the untagged text between regex matches
        cursor = 0

        for match in CODE_PATTERN.finditer(result.text):
            # 1. Grab the raw text before this match and add it to our clean string
            before = result.text[cursor : match.start()]
            clean_text += before

            passage_text = match.group("text")
            code = match.group("code")

            # 2. Calculate the offsets based on the CURRENT length of our clean string
            begin = len(clean_text)
            end = begin + len(passage_text)

            # 3. Only append to spans if the code is recognized
            if code.upper() in self.codename2id_dict:
                spans.append(
                    ParsedSpan(
                        code_id=self.codename2id_dict[code.upper()],
                        text=passage_text,
                        begin=begin + start_offset,
                        end=end + start_offset,
                    )
                )

            # 4. ALWAYS append the text and advance the original string cursor
            clean_text += passage_text
            cursor = match.end()

        return spans
