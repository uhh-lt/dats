"""Unit tests for reasoning_paragraphs: the paragraphs of a reasoning memo.

An annotation merged from several suggestions has one reasoning per suggestion;
its memo shows each distinct, non-blank reasoning once, as one paragraph.
"""

import pytest

from modules.llm_assistant.tasks.llm_assistant_task import reasoning_paragraphs


@pytest.mark.parametrize(
    "reasonings,expected_paragraphs",
    [
        # No reasoning (or the prompt requests none): no memo.
        pytest.param([], [], id="none"),
        # Blank and whitespace-only reasonings: no memo.
        pytest.param(["", "   ", "\n\t"], [], id="blank"),
        # One reasoning, stripped.
        pytest.param(["  Alice is named.\n"], ["Alice is named."], id="one"),
        # A repeated reasoning (also with other surrounding whitespace) is one
        # paragraph.
        pytest.param(
            ["Alice is named.", " Alice is named. "],
            ["Alice is named."],
            id="duplicate",
        ),
        # Distinct reasonings stay in order, blank ones are dropped.
        pytest.param(
            ["Second reason.", "", "First reason.", "Second reason."],
            ["Second reason.", "First reason."],
            id="distinct-in-order",
        ),
    ],
)
def test_reasoning_paragraphs_drop_blank_and_repeated_reasonings(
    reasonings: list[str], expected_paragraphs: list[str]
) -> None:
    """Each distinct, non-blank reasoning is one paragraph, in order."""
    assert reasoning_paragraphs(reasonings) == expected_paragraphs
