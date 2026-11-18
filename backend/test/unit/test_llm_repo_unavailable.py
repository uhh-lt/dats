"""Unit tests for `LLMRepo.is_unavailable`: whether a failed LLM request failed
because the LLM could not answer it now (it could not be reached, timed out or
failed with a server error), which the LLM Assistant treats as an outage, or
because of the request itself, which fails on every attempt."""

import httpx
import openai
import pytest

from repos.llm_repo import LLMRepo

REQUEST = httpx.Request("POST", "http://llm")


def _response(status_code: int) -> httpx.Response:
    return httpx.Response(status_code, request=REQUEST)


@pytest.mark.parametrize(
    "error,unavailable",
    [
        # The LLM did not answer in time.
        pytest.param(openai.APITimeoutError(REQUEST), True, id="timeout"),
        # The LLM could not be reached.
        pytest.param(
            openai.APIConnectionError(message="refused", request=REQUEST),
            True,
            id="connection",
        ),
        # The LLM failed with a server error (5xx).
        pytest.param(
            openai.InternalServerError("error", response=_response(500), body=None),
            True,
            id="500",
        ),
        pytest.param(
            openai.InternalServerError("busy", response=_response(503), body=None),
            True,
            id="503",
        ),
        # The request is too long: it fails on every attempt.
        pytest.param(
            openai.BadRequestError(
                "maximum context length exceeded", response=_response(400), body=None
            ),
            False,
            id="context-window",
        ),
        # Another error of the request (4xx).
        pytest.param(
            openai.UnprocessableEntityError(
                "invalid", response=_response(422), body=None
            ),
            False,
            id="422",
        ),
        pytest.param(
            openai.RateLimitError("slow down", response=_response(429), body=None),
            False,
            id="429",
        ),
        # Anything else.
        pytest.param(ValueError("invalid"), False, id="other"),
    ],
)
def test_is_unavailable_tells_outages_from_errors_of_the_request(
    error: Exception, unavailable: bool
) -> None:
    """Connection errors, timeouts and server errors are outages, the rest not."""
    assert LLMRepo.is_unavailable(error) is unavailable
