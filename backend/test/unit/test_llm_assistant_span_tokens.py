"""Unit tests for AnnotationTask._to_span_annotation.

The LLM suggests spans by character offsets; the task maps them to tokens. A
suggestion that covers no character or token cannot become a span annotation, so
it is skipped instead of failing the job.
"""

import pytest

from modules.llm_assistant.tasks.annotation_task import AnnotationTask

# Characters:  0     6     12  16
CONTENT = "Alice meets Bob in Berlin."
# tokens: Alice(0) meets(1) Bob(2) in(3) Berlin.(4); the whitespace before a token
# maps to that token
TOKEN_ENDS = [5, 11, 15, 18, 26]


def _token_map() -> dict[int, int]:
    token_map: dict[int, int] = {}
    last = 0
    for token_id, token_end in enumerate(TOKEN_ENDS):
        for offset in range(last, token_end):
            token_map[offset] = token_id
        last = token_end
    return token_map


def _to_span(begin: int, end: int, text: str | None = None):
    return AnnotationTask._to_span_annotation(
        sdoc_id=1,
        code_id=2,
        begin=begin,
        end=end,
        text=CONTENT[begin:end] if text is None else text,
        document_token_map=_token_map(),
    )


def test_span_maps_to_an_exclusive_token_range() -> None:
    """'Bob' (characters 12-15) is token 2, so its token range is 2-3."""
    span = _to_span(12, 15)

    assert span is not None
    assert (span.begin, span.end, span.begin_token, span.end_token) == (12, 15, 2, 3)
    assert span.span_text == "Bob"


@pytest.mark.parametrize(
    "begin,end,text",
    [
        # no character is covered, although the LLM sent a text
        pytest.param(12, 12, "Bob", id="empty-characters"),
        # the end lies before the begin
        pytest.param(15, 12, "Bob", id="inverted-characters"),
        # only whitespace
        pytest.param(11, 12, None, id="blank-text"),
        # beyond the end of the document: no token
        pytest.param(20, 40, "far away", id="outside-the-document"),
    ],
)
def test_span_without_characters_or_tokens_is_skipped(
    begin: int, end: int, text: str | None
) -> None:
    """Suggestions that would become empty span annotations are skipped (None)."""
    assert _to_span(begin, end, text) is None
