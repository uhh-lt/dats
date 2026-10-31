import difflib
from dataclasses import dataclass

from loguru import logger
from pydantic import BaseModel, Field

from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.prompt.prompt_enum import OutputFormat
from modules.llm_assistant.llm_assistant_enum import GroundingMethod
from modules.llm_assistant.strategies.code_annotation_strategy import (
    CodeAnnotationStrategy,
)
from modules.llm_assistant.strategies.types.parsed_span import ParsedSpan


class LLMExtractedPassage(BaseModel):
    category: str = Field(description="The category/code of the extracted text passage")
    exact_quote: str = Field(description="The exact verbatim quote of the text passage")
    context_before: str = Field(
        description="Verbatim text immediately before the quote (anchor for disambiguation)",
    )
    context_after: str = Field(
        description="Verbatim text immediately after the quote (anchor for disambiguation)",
    )


class LLMExtractionResult(BaseModel):
    passages: list[LLMExtractedPassage] = Field(
        default_factory=list, description="The extracted relevant text passages"
    )


@dataclass(frozen=True)
class GroundedQuote:
    begin: int
    end: int
    method: GroundingMethod
    score: float


class FuzzyGroundingStrategy(CodeAnnotationStrategy):
    """Span annotation via extraction and context-anchored grounding (<output-format:context>).

    The LLM acts as an extraction engine and outputs structured data with the
    category, an exact verbatim quote, and surrounding context. The backend
    grounds each quote to character offsets within the message's segment via
    exact matching, falling back to fuzzy matching (difflib) using the context
    as an anchor for disambiguation.
    """

    output_format = OutputFormat.CONTEXT

    def get_response_model(self) -> type[LLMExtractionResult]:
        """Return the structured schema for extracted text passages."""
        return LLMExtractionResult

    # --- PARSING + GROUNDING ---

    def parse_result(
        self,
        result: LLMExtractionResult,
        sdoc_data: SourceDocumentDataORM,
        message_id: int,
    ) -> list[ParsedSpan]:
        """Parse and ground extracted text passages to absolute char offsets."""
        segment = self.segments(sdoc_data)[message_id]
        segment_start, segment_text = segment.begin, segment.text
        spans: list[ParsedSpan] = []
        for passage in result.passages:
            code_id = self._code_id_for_name(passage.category)
            if code_id is None:
                continue
            if passage.exact_quote.strip() == "":
                continue

            located = self._locate_quote(passage, segment_text)
            if located is None:
                quote_preview = self._preview(passage.exact_quote)
                logger.debug(
                    "Could not ground quote for document {}, message {}, code {}: length={}, preview={!r}",
                    sdoc_data.id,
                    message_id,
                    passage.category,
                    len(passage.exact_quote),
                    quote_preview,
                )
                continue

            begin = segment_start + located.begin
            end = segment_start + located.end
            logger.debug(
                "Grounded quote for document {}, message {}, code {}: method={}, score={:.3f}, offsets={}:{}, length={}, preview={!r}",
                sdoc_data.id,
                message_id,
                passage.category,
                located.method.value,
                located.score,
                begin,
                end,
                end - begin,
                self._preview(sdoc_data.content[begin:end]),
            )
            spans.append(
                ParsedSpan(
                    code_id=code_id,
                    text=sdoc_data.content[begin:end],
                    begin=begin,
                    end=end,
                )
            )

        return spans

    @staticmethod
    def _preview(text: str, max_length: int = 100) -> str:
        """Return a compact, single-line preview for diagnostic logging."""
        compact = " ".join(text.split())
        if len(compact) <= max_length:
            return compact
        return f"{compact[: max_length - 3]}..."

    def _locate_quote(
        self, passage: LLMExtractedPassage, content: str
    ) -> GroundedQuote | None:
        """Locate the exact_quote in content, using context as an anchor.

        Strategy:
        1. Exact match of context_before + quote + context_after.
        2. Exact match of the quote alone (if unambiguous).
        3. Fuzzy match of the anchored string via difflib sliding window.
        """
        quote = passage.exact_quote
        before = passage.context_before or ""
        after = passage.context_after or ""

        # 1. anchored exact match
        anchored = before + quote + after
        if before or after:
            idx = content.find(anchored)
            if idx != -1:
                begin = idx + len(before)
                return GroundedQuote(
                    begin=begin,
                    end=begin + len(quote),
                    method=GroundingMethod.ANCHORED_EXACT,
                    score=1.0,
                )

        # 2. exact quote match (only if it occurs exactly once)
        first = content.find(quote)
        if first != -1 and content.find(quote, first + 1) == -1:
            return GroundedQuote(
                begin=first,
                end=first + len(quote),
                method=GroundingMethod.QUOTE_EXACT,
                score=1.0,
            )

        # 3. fuzzy anchored match
        return self._fuzzy_locate(anchored, len(before), len(quote), content)

    def _fuzzy_locate(
        self, anchored: str, before_len: int, quote_len: int, content: str
    ) -> GroundedQuote | None:
        """Slide a window of len(anchored) over content, score with difflib."""
        if not anchored or not content:
            return None

        threshold = self.prompt.settings.fuzzy_threshold
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
        return GroundedQuote(
            begin=begin,
            end=begin + quote_len,
            method=GroundingMethod.FUZZY,
            score=best_ratio,
        )
