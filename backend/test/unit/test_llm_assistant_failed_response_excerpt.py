"""Unit tests for failed_response_excerpt: the raw LLM responses of the failed
requests that the result of a failed or partially failed document keeps.

Every result stays in the job output, which holds thousands of documents, so
the value is cut after `FAILED_RESPONSE_EXCERPT_CHARACTERS` characters and marked
as truncated.
"""

import pytest

from modules.llm_assistant.tasks.llm_assistant_task import (
    FAILED_RESPONSE_EXCERPT_CHARACTERS,
    failed_response_excerpt,
)

LIMIT = FAILED_RESPONSE_EXCERPT_CHARACTERS


@pytest.mark.parametrize(
    "raw_responses,expected",
    [
        # No response (e.g. the requests failed without one): no value.
        pytest.param([], None, id="none"),
        # One response within the limit is kept as it is.
        pytest.param(["{}"], "{}", id="one"),
        # A response of exactly the limit is kept as it is.
        pytest.param(["x" * LIMIT], "x" * LIMIT, id="at-limit"),
        # A longer response is cut at the limit and marked as truncated.
        pytest.param(
            ["x" * (LIMIT + 5)],
            "x" * LIMIT + "\n[truncated: 5 more characters]",
            id="over-limit",
        ),
        # Several responses are numbered and joined before the cut.
        pytest.param(
            ["a", "b"],
            "Response 1 of 2:\na\n---\nResponse 2 of 2:\nb",
            id="several",
        ),
    ],
)
def test_failed_response_excerpt_keeps_at_most_the_excerpt_characters(
    raw_responses: list[str], expected: str | None
) -> None:
    """The raw responses as one value, cut after the excerpt length."""
    assert failed_response_excerpt(raw_responses) == expected
