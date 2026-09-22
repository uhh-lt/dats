import json
from types import SimpleNamespace
from typing import Any

import pytest

from llm_file_converter.llm import ConversionError, convert_content
from llm_file_converter.models import load_metadata_spec

SPEC = load_metadata_spec('{"year": {"type": "integer"}}')

VALID_PAYLOAD = {
    "plaintext": "Hello world",
    "html": "<p>Hello world</p>",
    "metadata": {"year": 1923},
}


def make_response(payload: Any, prompt_tokens: int = 10, completion_tokens: int = 5):
    content = payload if isinstance(payload, str) else json.dumps(payload)
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))],
        usage=SimpleNamespace(prompt_tokens=prompt_tokens, completion_tokens=completion_tokens),
    )


class FakeCompletions:
    """Mock of client.chat.completions returning queued responses."""

    def __init__(self, responses: list):
        self._responses = list(responses)
        self.calls: list[dict] = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        return self._responses.pop(0)


class FakeClient:
    def __init__(self, responses: list):
        self.chat = SimpleNamespace(completions=FakeCompletions(responses))


async def test_success_first_try() -> None:
    client = FakeClient([make_response(VALID_PAYLOAD)])
    success = await convert_content(client, model="m", prompt="p", spec=SPEC)
    assert success.result.plaintext == "Hello world"
    assert success.result.metadata.year == 1923
    assert success.prompt_tokens == 10
    assert len(client.chat.completions.calls) == 1


async def test_structured_output_request_format() -> None:
    client = FakeClient([make_response(VALID_PAYLOAD)])
    await convert_content(client, model="m", prompt="p", spec=SPEC)
    call = client.chat.completions.calls[0]
    assert call["response_format"]["type"] == "json_schema"
    schema = call["response_format"]["json_schema"]["schema"]
    assert "plaintext" in schema["properties"]


async def test_retry_on_invalid_json() -> None:
    client = FakeClient([make_response("not json at all"), make_response(VALID_PAYLOAD)])
    success = await convert_content(client, model="m", prompt="p", spec=SPEC, max_retries=2)
    assert success.result.plaintext == "Hello world"
    assert len(client.chat.completions.calls) == 2
    # the error was fed back to the model
    retry_messages = client.chat.completions.calls[1]["messages"]
    assert any("invalid" in m["content"].lower() for m in retry_messages if m["role"] == "user")


async def test_retry_on_validation_error() -> None:
    missing_plaintext = {"html": "<p>x</p>"}
    client = FakeClient([make_response(missing_plaintext), make_response(VALID_PAYLOAD)])
    success = await convert_content(client, model="m", prompt="p", spec=SPEC, max_retries=1)
    assert success.result.plaintext == "Hello world"


async def test_fails_after_exhausting_retries() -> None:
    client = FakeClient([make_response("bad"), make_response("bad"), make_response("bad")])
    with pytest.raises(ConversionError, match="failed after 3 attempts"):
        await convert_content(client, model="m", prompt="p", spec=SPEC, max_retries=2)


async def test_empty_response_raises_immediately() -> None:
    client = FakeClient([make_response("")])
    with pytest.raises(ConversionError, match="empty response"):
        await convert_content(client, model="m", prompt="p", spec=SPEC)


async def test_token_usage_accumulated_across_retries() -> None:
    client = FakeClient([make_response("bad"), make_response(VALID_PAYLOAD)])
    success = await convert_content(client, model="m", prompt="p", spec=SPEC, max_retries=1)
    assert success.prompt_tokens == 20
    assert success.completion_tokens == 10
