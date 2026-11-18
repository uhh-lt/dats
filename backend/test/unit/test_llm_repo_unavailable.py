"""Unit tests for `LLMRepo.is_unavailable`: whether a failed LLM request failed
because the LLM could not answer it now (it could not be reached, timed out or
failed with a server error), which the LLM Assistant treats as an outage, or
because of the request itself, which fails on every attempt."""

import httpx
import pytest
from litellm import exceptions as litellm

from repos.llm_repo import LLMRepo

MODEL = "model"
PROVIDER = "hosted_vllm"


def _response(status_code: int) -> httpx.Response:
    return httpx.Response(status_code, request=httpx.Request("POST", "http://llm"))


@pytest.mark.parametrize(
    "error,unavailable",
    [
        # The LLM did not answer in time.
        pytest.param(litellm.Timeout("timed out", MODEL, PROVIDER), True, id="timeout"),
        # The LLM could not be reached.
        pytest.param(
            litellm.APIConnectionError("refused", PROVIDER, MODEL),
            True,
            id="connection",
        ),
        # The LLM failed with a server error (5xx).
        pytest.param(
            litellm.InternalServerError("error", PROVIDER, MODEL, _response(500)),
            True,
            id="500",
        ),
        pytest.param(
            litellm.ServiceUnavailableError("busy", PROVIDER, MODEL, _response(503)),
            True,
            id="503",
        ),
        # The request is too long: it fails on every attempt.
        pytest.param(
            litellm.ContextWindowExceededError("too long", MODEL, PROVIDER),
            False,
            id="context-window",
        ),
        # Another error of the request (4xx).
        pytest.param(
            litellm.BadRequestError("bad", MODEL, PROVIDER, _response(400)),
            False,
            id="400",
        ),
        pytest.param(
            litellm.RateLimitError("slow down", PROVIDER, MODEL, _response(429)),
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
