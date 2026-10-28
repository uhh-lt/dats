import re

from pydantic import BaseModel

from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.prompt_template.prompt_template_enum import OutputFormat
from core.prompt_template.prompt_template_renderer import PromptRenderer
from modules.llm_assistant.strategies.code_annotation_strategy import (
    CodeAnnotationStrategy,
)
from modules.llm_assistant.strategies.types.parsed_span import ParsedSpan


class LLMHighlightedAnnotationResult(BaseModel):
    text: str
    reasoning: str | None = None


class LLMAnnotationResults(BaseModel):
    data: list[LLMHighlightedAnnotationResult]


def _compile_code_pattern(code_names: list[str]) -> re.Pattern[str]:
    """Match inline tags for the project's actual code names."""
    escaped_names = sorted(
        (re.escape(code_name) for code_name in code_names),
        key=len,
        reverse=True,
    )
    if not escaped_names:
        return re.compile(r"(?!)")

    alternatives = "|".join(escaped_names)
    return re.compile(
        rf"<(?P<code>{alternatives})>(?P<text>.*?)</(?P=code)>",
        re.DOTALL,
    )


class NERInlineTagStrategy(CodeAnnotationStrategy):
    """Span annotation via inline XML-style tags (<output-format:inline>).

    The LLM repeats the text of a segment and wraps relevant text passages in
    inline tags like ``<EVIDENCE>survey results</EVIDENCE>``. Parsing depends on
    those tags.
    """

    output_format = OutputFormat.INLINE

    def __init__(self, renderer: PromptRenderer):
        super().__init__(renderer=renderer)
        self.code_pattern = _compile_code_pattern(list(self.codename2id))

    def get_response_model(self) -> type[LLMHighlightedAnnotationResult]:
        return LLMHighlightedAnnotationResult

    def parse_result(
        self,
        result: LLMHighlightedAnnotationResult,
        sdoc_data: SourceDocumentDataORM,
        message_id: int,
    ) -> list[ParsedSpan]:
        # the answer repeats the text of the message's segment
        start_offset = self.segments(sdoc_data)[message_id].begin

        clean_text = ""
        spans: list[ParsedSpan] = []

        # Tracks our position in the ORIGINAL string so we can slice out the untagged text between regex matches
        cursor = 0

        for match in self.code_pattern.finditer(result.text):
            # 1. Grab the raw text before this match and add it to our clean string
            before = result.text[cursor : match.start()]
            clean_text += before

            passage_text = match.group("text")
            code = match.group("code")

            # 2. Calculate the offsets based on the CURRENT length of our clean string
            begin = len(clean_text)
            end = begin + len(passage_text)

            # 3. Only append to spans if the code is recognized
            source_begin = begin + start_offset
            source_end = end + start_offset
            source_text = sdoc_data.content[source_begin:source_end]
            code_id = self._code_id_for_name(code)
            if code_id is not None and source_text == passage_text:
                spans.append(
                    ParsedSpan(
                        code_id=code_id,
                        text=passage_text,
                        begin=source_begin,
                        end=source_end,
                    )
                )

            # 4. ALWAYS append the text and advance the original string cursor
            clean_text += passage_text
            cursor = match.end()

        return spans
