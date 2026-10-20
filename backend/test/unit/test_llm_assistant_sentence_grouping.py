"""Unit tests for SentenceAnnotationTask._group_into_ranges.

The LLM suggests (sentence_id, code_id) pairs; the task merges them into the
(sentence_id_start, sentence_id_end, code_id) ranges it persists as sentence
annotations. The result step counts these ranges, so every range must be valid
and every suggested pair must be covered exactly once.
"""

import pytest

from modules.llm_assistant.tasks.sentence_annotation_task import (
    SentenceAnnotationTask,
)

A = 1
B = 2


@pytest.mark.parametrize(
    ("parsed_items", "expected"),
    [
        # A single suggestion is a single-sentence range.
        pytest.param([(3, A)], [(3, 3, A)], id="single"),
        # Consecutive sentences of one code are merged into one range.
        pytest.param(
            [(0, A), (1, A), (2, A)],
            [(0, 2, A)],
            id="consecutive-same-code",
        ),
        # A gap splits the sentences of one code into two ranges.
        pytest.param(
            [(0, A), (1, A), (4, A)],
            [(0, 1, A), (4, 4, A)],
            id="gap-same-code",
        ),
        # Adjacent sentences with different codes stay separate ranges.
        pytest.param(
            [(0, A), (1, B)],
            [(0, 0, A), (1, 1, B)],
            id="code-change-without-gap",
        ),
        # Regression: a gap AND a code change produced an inverted (5, 0, A) range.
        pytest.param(
            [(0, A), (5, B)],
            [(0, 0, A), (5, 5, B)],
            id="gap-and-code-change",
        ),
        # The LLM may return the sentences in any order.
        pytest.param(
            [(4, A), (1, A), (2, A)],
            [(1, 2, A), (4, 4, A)],
            id="unsorted",
        ),
        # Two codes on the same sentences: one range per code.
        pytest.param(
            [(1, A), (1, B), (2, A), (2, B)],
            [(1, 2, A), (1, 2, B)],
            id="two-codes-per-sentence",
        ),
        # Interleaved codes over a longer document.
        pytest.param(
            [(0, A), (1, B), (2, A), (3, A), (7, B), (8, B)],
            [(0, 0, A), (1, 1, B), (2, 3, A), (7, 8, B)],
            id="interleaved-codes",
        ),
        # Duplicate pairs (e.g. from overlapping chunks) count once.
        pytest.param(
            [(3, A), (3, A), (4, A), (4, A)],
            [(3, 4, A)],
            id="duplicates",
        ),
        # No suggestions, no ranges.
        pytest.param([], [], id="empty"),
    ],
)
def test_group_into_ranges(
    parsed_items: list[tuple[int, int]],
    expected: list[tuple[int, int, int]],
) -> None:
    """Suggested pairs become sorted, valid ranges per code."""
    assert SentenceAnnotationTask._group_into_ranges(parsed_items) == expected


@pytest.mark.parametrize(
    "parsed_items",
    [
        # Mixed gaps, code changes, duplicates and unsorted input.
        pytest.param(
            [(9, B), (0, A), (5, B), (1, A), (5, B), (2, B), (3, A), (8, B)],
            id="mixed",
        ),
        # Every sentence carries both codes.
        pytest.param(
            [(s, c) for s in range(6) for c in (A, B)],
            id="all-sentences-both-codes",
        ),
    ],
)
def test_group_into_ranges_covers_every_pair_exactly_once(
    parsed_items: list[tuple[int, int]],
) -> None:
    """Every range is valid (start <= end), and the ranges cover exactly the
    suggested (sentence, code) pairs: none lost, none invented, none twice."""
    ranges = SentenceAnnotationTask._group_into_ranges(parsed_items)

    covered: list[tuple[int, int]] = []
    for start, end, code_id in ranges:
        assert start <= end
        covered.extend((sentence_id, code_id) for sentence_id in range(start, end + 1))

    assert len(covered) == len(set(covered))
    assert set(covered) == set(parsed_items)
