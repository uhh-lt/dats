import difflib
import random
from collections import defaultdict

from loguru import logger
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from config import conf
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.project.project_crud import crud_project
from modules.llm_assistant.llm_job_dto import (
    AnnotationParams,
    FuzzyGroundingStrategyParams,
    LLMPromptTemplates,
    StrategyType,
)
from modules.llm_assistant.prompts.data_tag import DataTag
from modules.llm_assistant.strategies.llm_strategy import LLMStrategy
from modules.llm_assistant.strategies.types.parsed_span import ParsedSpan
from repos.llm_repo import LLMMessage

lac = conf.llm_assistant


class LLMExtractedEntity(BaseModel):
    category: str = Field(description="The category/code of the extracted entity")
    exact_quote: str = Field(
        description="The exact verbatim quote of the entity from the text"
    )
    context_before: str = Field(
        default="",
        description="Verbatim text immediately before the quote (anchor for disambiguation)",
    )
    context_after: str = Field(
        default="",
        description="Verbatim text immediately after the quote (anchor for disambiguation)",
    )


class LLMExtractionResult(BaseModel):
    entities: list[LLMExtractedEntity] = Field(
        default_factory=list, description="The extracted entities"
    )


EN_PROMPT_TEMPLATE = """
You are an extraction engine that identifies entities in a text.

Allowed codes:
{codes}

Code definitions:
{code_definitions}

Rules:
- Extract passages matching the code system.
- For each entity, output the category, the exact verbatim quote, and the surrounding context.
- The exact_quote MUST be copied verbatim from the text (do not change whitespace or punctuation).
- Provide up to {context_before_chars} characters of context_before and {context_after_chars} characters of context_after to uniquely locate the quote.
- Do NOT generate entities that are not present in the text.
- If no relevant text fits the codes, return an empty list.

{examples_block}

Text:
<chunk>
""".strip()


DE_PROMPT_TEMPLATE = """
Du bist eine Extraktions-Engine, die Entitäten in einem Text identifiziert.

Erlaubte Codes:
{codes}

Code-Definitionen:
{code_definitions}

Regeln:
- Extrahiere Passagen, die zum Code-System passen.
- Gib für jede Entität die Kategorie, das exakte wörtliche Zitat und den umgebenden Kontext aus.
- Das exact_quote MUSS wörtlich aus dem Text kopiert werden (keine Änderung von Leerzeichen oder Satzzeichen).
- Gib bis zu {context_before_chars} Zeichen context_before und {context_after_chars} Zeichen context_after an, um das Zitat eindeutig zu lokalisieren.
- Generiere KEINE Entitäten, die nicht im Text vorhanden sind.
- Wenn keine passende Textpassage zu den Codes vorhanden ist, gib eine leere Liste zurück.

{examples_block}

Text:
<chunk>
""".strip()


class FuzzyGroundingStrategy(LLMStrategy[FuzzyGroundingStrategyParams]):
    """Span annotation via extractive JSON + context-anchored fuzzy grounding.

    The LLM acts as an extraction engine and outputs structured JSON with the
    category, an exact verbatim quote, and surrounding context. The backend
    grounds each quote to character offsets via exact matching, falling back to
    fuzzy matching (difflib) using the context as an anchor for disambiguation.
    Documents are processed in overlapping chunks.
    """

    strategy_type = StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING
    display_name = "Context-Anchored Extraction"
    description = (
        "The LLM extracts entities as JSON with an exact quote plus surrounding "
        "context. The backend locates each quote in the document (exact or fuzzy "
        "matching) to compute precise offsets. Robust for long documents and "
        "repeated mentions. Documents are processed in overlapping chunks."
    )
    strategy_params_type = FuzzyGroundingStrategyParams
    allowed_data_tags = [DataTag.CHUNK.value]

    supported_languages = ["en", "de"]

    def __init__(
        self,
        db: Session,
        project_id: int,
        is_fewshot: bool,
        strategy_params: FuzzyGroundingStrategyParams | None = None,
        prompt_templates: list[LLMPromptTemplates] | None = None,
        params: AnnotationParams | None = None,
        example_ids: list[int] | None = None,
    ):
        project = crud_project.read(db=db, id=project_id)
        self.db = db
        self.codes = project.codes
        self.codename2id_dict = {code.name.upper(): code.id for code in self.codes}
        self.codeids2code_dict = {code.id: code for code in self.codes}
        self.fuzzy_params = strategy_params or FuzzyGroundingStrategyParams(
            llm_strategy_type=StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING
        )

        super().__init__(
            db=db,
            project_id=project_id,
            is_fewshot=is_fewshot,
            valid_data_tags=[DataTag.CHUNK],
            prompt_templates=prompt_templates,
            params=params,
            example_ids=example_ids,
        )

    def get_response_model(self) -> type[LLMExtractionResult]:
        return LLMExtractionResult

    # --- PROMPT TEMPLATE GENERATION ---

    def _build_examples_block(self, language: str) -> str:
        if language == "en":
            return (
                "Example output:\n"
                '[{"category": "PER", "exact_quote": "Tim", '
                '"context_before": "On Tuesday, ", '
                '"context_after": " works for the university"}]'
            )
        return (
            "Beispiel-Ausgabe:\n"
            '[{"category": "PER", "exact_quote": "Tim", '
            '"context_before": "Am Dienstag, ", '
            '"context_after": " arbeitet für die Universität"}]'
        )

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

        examples_block = self._build_examples_block(language)

        # few-shot: render real examples in the JSON output format
        if self.is_fewshot:
            examples_block = self._build_fewshot_examples_block(
                language=language, example_ids=example_ids, params=params
            )

        template = EN_PROMPT_TEMPLATE if language == "en" else DE_PROMPT_TEMPLATE
        return template.format(
            codes=codes,
            code_definitions=code_definitions,
            context_before_chars=self.fuzzy_params.context_before_chars,
            context_after_chars=self.fuzzy_params.context_after_chars,
            examples_block=examples_block,
        )

    def _build_fewshot_examples_block(
        self,
        language: str,
        example_ids: list[int] | None,
        params: AnnotationParams,
    ) -> str:
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

        threshold = lac.few_shot_threshold
        if example_ids is None:
            for cid, annos in code_id2annos.items():
                assert len(annos) >= threshold, (
                    f"Code {cid} has less than {threshold} annotations!"
                )
                code_id2annos[cid] = random.sample(annos, threshold)

        sdoc_ids = {a.sdoc_id for a in annotations}
        sdoc_id2data = {
            d.id: d
            for d in crud_sdoc_data.read_by_ids(db=self.db, ids=list(sdoc_ids))
            if d is not None
        }

        # render each example as a JSON extraction entry
        example_lines: list[str] = []
        for cid, annos in code_id2annos.items():
            code = self.codeids2code_dict[cid].name.upper()
            for a in annos:
                sdoc = sdoc_id2data[a.sdoc_id]
                quote = sdoc.content[a.begin : a.end]
                ctx_before = sdoc.content[
                    max(0, a.begin - self.fuzzy_params.context_before_chars) : a.begin
                ]
                ctx_after = sdoc.content[
                    a.end : a.end + self.fuzzy_params.context_after_chars
                ]
                example_lines.append(
                    '{"category": "%s", "exact_quote": %s, "context_before": %s, "context_after": %s}'
                    % (
                        code,
                        _json_str(quote),
                        _json_str(ctx_before),
                        _json_str(ctx_after),
                    )
                )

        header = "Examples:" if language == "en" else "Beispiele:"
        return f"{header}\n[" + ",\n".join(example_lines) + "]"

    # --- PROMPT BUILDING (chunked) ---

    def _chunk_document(
        self, sdoc_data: SourceDocumentDataORM
    ) -> list[tuple[int, str]]:
        """Split the document into overlapping token windows.

        Returns a list of (chunk_start_char_offset, chunk_text).
        """
        token_starts = sdoc_data.token_starts
        token_ends = sdoc_data.token_ends
        num_tokens = len(token_starts)
        size = self.fuzzy_params.chunk_size_tokens
        overlap = self.fuzzy_params.chunk_overlap_tokens

        if num_tokens == 0:
            return [(0, sdoc_data.content)]
        if num_tokens <= size:
            return [(0, sdoc_data.content)]

        chunks: list[tuple[int, str]] = []
        step = max(1, size - overlap)
        start_tok = 0
        while start_tok < num_tokens:
            end_tok = min(start_tok + size, num_tokens)
            char_start = token_starts[start_tok]
            char_end = token_ends[end_tok - 1]
            chunks.append((char_start, sdoc_data.content[char_start:char_end]))
            if end_tok >= num_tokens:
                break
            start_tok += step
        return chunks

    def build_prompt(
        self, language: str, sdoc_data: SourceDocumentDataORM
    ) -> list[LLMMessage]:
        chunks = self._chunk_document(sdoc_data)
        system_prompt = self._build_system_prompt(language)
        messages: list[LLMMessage] = []
        for _, chunk_text in chunks:
            user_prompt = self._build_user_prompt(language=language, data=chunk_text)
            messages.append(
                LLMMessage(system_prompt=system_prompt, user_prompt=user_prompt)
            )
        return messages

    # --- PARSING + GROUNDING ---

    def parse_result(
        self,
        result: LLMExtractionResult,
        sdoc_data: SourceDocumentDataORM,
        message_id: int,
    ) -> list[ParsedSpan]:
        """Parse and ground extracted entities to absolute char offsets."""
        spans: list[ParsedSpan] = []
        for entity in result.entities:
            code_id = self.codename2id_dict.get(entity.category.upper())
            if code_id is None:
                continue
            if entity.exact_quote.strip() == "":
                continue

            located = self._locate_quote(entity, sdoc_data.content)
            if located is None:
                logger.debug(
                    "Could not ground quote '{}' for code {}",
                    entity.exact_quote,
                    entity.category,
                )
                continue

            begin, end = located
            spans.append(
                ParsedSpan(
                    code_id=code_id,
                    text=sdoc_data.content[begin:end],
                    begin=begin,
                    end=end,
                )
            )

        return self._dedupe_spans(spans)

    def _locate_quote(
        self, entity: LLMExtractedEntity, content: str
    ) -> tuple[int, int] | None:
        """Locate the exact_quote in content, using context as an anchor.

        Strategy:
        1. Exact match of context_before + quote + context_after.
        2. Exact match of the quote alone (if unambiguous).
        3. Fuzzy match of the anchored string via difflib sliding window.
        """
        quote = entity.exact_quote
        before = entity.context_before or ""
        after = entity.context_after or ""

        # 1. anchored exact match
        anchored = before + quote + after
        idx = content.find(anchored)
        if idx != -1:
            begin = idx + len(before)
            return begin, begin + len(quote)

        # 2. exact quote match (only if it occurs exactly once)
        first = content.find(quote)
        if first != -1 and content.find(quote, first + 1) == -1:
            return first, first + len(quote)

        # 3. fuzzy anchored match
        return self._fuzzy_locate(anchored, len(before), len(quote), content)

    def _fuzzy_locate(
        self, anchored: str, before_len: int, quote_len: int, content: str
    ) -> tuple[int, int] | None:
        """Slide a window of len(anchored) over content, score with difflib."""
        if not anchored or not content:
            return None

        threshold = self.fuzzy_params.fuzzy_threshold
        win = len(anchored)
        best_ratio = 0.0
        best_start = -1

        # candidate starts: align on whitespace to reduce work
        for start in range(0, max(1, len(content) - win + 1)):
            window = content[start : start + win]
            ratio = difflib.SequenceMatcher(None, anchored, window).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_start = start

        if best_start == -1 or best_ratio < threshold:
            return None

        begin = best_start + before_len
        return begin, begin + quote_len

    def _dedupe_spans(self, spans: list[ParsedSpan]) -> list[ParsedSpan]:
        """Remove duplicate spans arising from overlapping chunks.

        Two spans are duplicates if they share a code and overlap.
        """
        result: list[ParsedSpan] = []
        for span in sorted(spans, key=lambda s: (s["begin"], s["end"])):
            duplicate = False
            for kept in result:
                if kept["code_id"] != span["code_id"]:
                    continue
                # overlap check
                if kept["begin"] < span["end"] and span["begin"] < kept["end"]:
                    duplicate = True
                    break
            if not duplicate:
                result.append(span)
        return result


def _json_str(s: str) -> str:
    """JSON-encode a string (with quotes)."""
    import json

    return json.dumps(s, ensure_ascii=False)
