"""Unit tests for AnnotationTask._dedupe_annotations.

The LLM may suggest the same or overlapping spans several times (e.g. from
overlapping chunks). The task merges overlapping suggestions of the same code
before it persists them as span annotations; the result step counts the kept ones.
"""

from core.annotation.span_annotation_dto import SpanAnnotationCreate
from modules.llm_assistant.tasks.annotation_task import AnnotationTask

# Character offsets:   0     6     12   17
CONTENT = "Alice meets Bob in Berlin today."
SDOC_ID = 7
PERSON = 1
LOCATION = 2


def _span(begin: int, end: int, code_id: int = PERSON) -> SpanAnnotationCreate:
    """A span suggestion; tokens are approximated by character offsets."""
    return SpanAnnotationCreate(
        sdoc_id=SDOC_ID,
        code_id=code_id,
        begin=begin,
        end=end,
        begin_token=begin,
        end_token=end,
        span_text=CONTENT[begin:end],
    )


def _key(span: SpanAnnotationCreate) -> tuple[int, int, int, str]:
    return (span.code_id, span.begin, span.end, span.span_text)


def test_dedupe_keeps_distinct_spans() -> None:
    """Non-overlapping spans are all kept, sorted by code and position."""
    kept, removed = AnnotationTask._dedupe_annotations(
        [_span(12, 15), _span(0, 5), _span(19, 25, LOCATION)], CONTENT
    )

    assert [_key(s) for s in kept] == [
        (PERSON, 0, 5, "Alice"),
        (PERSON, 12, 15, "Bob"),
        (LOCATION, 19, 25, "Berlin"),
    ]
    assert removed == []


def test_dedupe_removes_exact_duplicates() -> None:
    """The same span suggested twice is kept once."""
    kept, removed = AnnotationTask._dedupe_annotations(
        [_span(0, 5), _span(0, 5)], CONTENT
    )

    assert [_key(s) for s in kept] == [(PERSON, 0, 5, "Alice")]
    assert len(removed) == 1


def test_dedupe_merges_overlapping_spans_of_the_same_code() -> None:
    """Overlapping spans of one code merge into their union, with its text."""
    kept, removed = AnnotationTask._dedupe_annotations(
        [_span(0, 11), _span(6, 15)], CONTENT
    )

    assert [_key(s) for s in kept] == [(PERSON, 0, 15, "Alice meets Bob")]
    assert (kept[0].begin_token, kept[0].end_token) == (0, 15)
    assert len(removed) == 1


def test_dedupe_merges_a_chain_of_overlaps() -> None:
    """A span overlapping the merged result is merged as well."""
    kept, _ = AnnotationTask._dedupe_annotations(
        [_span(0, 7), _span(5, 13), _span(12, 15)], CONTENT
    )

    assert [_key(s) for s in kept] == [(PERSON, 0, 15, "Alice meets Bob")]


def test_dedupe_keeps_touching_spans_apart() -> None:
    """Spans that only touch (end == begin) do not overlap and stay separate."""
    kept, removed = AnnotationTask._dedupe_annotations(
        [_span(0, 5), _span(5, 11)], CONTENT
    )

    assert [_key(s) for s in kept] == [
        (PERSON, 0, 5, "Alice"),
        (PERSON, 5, 11, " meets"),
    ]
    assert removed == []


def test_dedupe_keeps_overlapping_spans_of_different_codes() -> None:
    """Overlap only merges within one code; other codes keep their own span."""
    kept, removed = AnnotationTask._dedupe_annotations(
        [_span(12, 25, PERSON), _span(19, 25, LOCATION)], CONTENT
    )

    assert [_key(s) for s in kept] == [
        (PERSON, 12, 25, "Bob in Berlin"),
        (LOCATION, 19, 25, "Berlin"),
    ]
    assert removed == []


def test_dedupe_accounts_for_every_suggestion() -> None:
    """Every suggestion is either kept or reported as removed."""
    suggestions = [_span(0, 5), _span(0, 5), _span(2, 8), _span(12, 15)]

    kept, removed = AnnotationTask._dedupe_annotations(suggestions, CONTENT)

    assert len(kept) + len(removed) == len(suggestions)
    assert [_key(s) for s in kept] == [
        (PERSON, 0, 8, "Alice me"),
        (PERSON, 12, 15, "Bob"),
    ]


def test_dedupe_of_no_suggestions() -> None:
    """No suggestions, nothing kept or removed."""
    assert AnnotationTask._dedupe_annotations([], CONTENT) == ([], [])
