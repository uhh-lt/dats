"""The batch chat of the LLM (`LLMRepo.llm_batch_chat`), which the LLM Assistant
job and the perspectives send their requests through. The LLM is an external
service: the tests connect the repo to an OpenAI client whose chat completions
are a fake whose requests can fail or be held until the test releases them,
and replace the arguments of the connected LLM with none."""

import signal
import threading
import time
from collections.abc import Iterator
from types import FrameType

import httpx
import openai
import pytest
from openai.types.chat import ChatCompletion, ChatCompletionMessage
from openai.types.chat.chat_completion import Choice
from pydantic import BaseModel

from repos import llm_repo
from repos.llm_repo import LLMBatchChatResponse, LLMMessage, LLMRepo

# how long a held request waits at most for its release
HOLD_SECONDS = 30.0


class Answer(BaseModel):
    number: int


class FakeCompletions:
    """Answers the message "<n>" with the number n, the higher numbers sooner
    than the lower ones. A request of a number in `held` waits until `release`
    is set, one of a number in `down` fails as if the LLM could not be reached,
    one of a number in `invalid` answers no JSON. Records the requests that
    started."""

    def __init__(self) -> None:
        self.held: set[int] = set()
        self.down: set[int] = set()
        self.invalid: set[int] = set()
        self.release = threading.Event()
        self.started: list[int] = []
        self._lock = threading.Lock()

    def create(self, **kwargs: object) -> ChatCompletion:
        messages = kwargs["messages"]
        assert isinstance(messages, list)
        number = int(messages[-1]["content"])
        with self._lock:
            self.started.append(number)
        if number in self.held:
            self.release.wait(HOLD_SECONDS)
        else:
            time.sleep(0.01 * (10 - number))
        if number in self.down:
            raise openai.APIConnectionError(
                message="refused", request=httpx.Request("POST", "http://llm")
            )
        content = (
            "no json"
            if number in self.invalid
            else Answer(number=number).model_dump_json()
        )
        return ChatCompletion(
            id=str(number),
            created=0,
            model="fake",
            object="chat.completion",
            choices=[
                Choice(
                    index=0,
                    finish_reason="stop",
                    message=ChatCompletionMessage(role="assistant", content=content),
                )
            ],
        )


@pytest.fixture(scope="function")
def fake_completions(monkeypatch: pytest.MonkeyPatch) -> Iterator[FakeCompletions]:
    """`FakeCompletions` as the chat completions of the LLM connection, and no
    arguments of the connected LLM; releases the held requests at the end."""
    fake = FakeCompletions()
    client = openai.OpenAI(base_url="http://llm", api_key="fake")
    monkeypatch.setattr(client.chat.completions, "create", fake.create)
    monkeypatch.setattr(LLMRepo(), "_LLMRepo__llm_conn", client)
    monkeypatch.setattr(
        LLMRepo, "_completion_kwargs", lambda self, model, response_model: {}
    )
    yield fake
    fake.release.set()


def _batch_chat(numbers: list[int]) -> list[LLMBatchChatResponse[Answer]]:
    return LLMRepo().llm_batch_chat(
        model="fake",
        messages=[LLMMessage(user_prompt=str(number)) for number in numbers],
        response_model=Answer,
        capture_raw=True,
    )


# ===========================================================================
# LLM BATCH CHAT TESTS
# ===========================================================================


def test_the_batch_chat_answers_in_the_order_of_the_messages_with_the_failures(
    fake_completions: FakeCompletions,
) -> None:
    """The later messages are answered sooner; request 2 fails because the LLM
    is down and request 4 answers no JSON: every message gets its own response
    in the order of the messages, the failures with their error."""
    fake_completions.down = {2}
    fake_completions.invalid = {4}

    responses = _batch_chat(list(range(6)))

    assert [response.parsed for response in responses] == [
        Answer(number=0),
        Answer(number=1),
        None,
        Answer(number=3),
        None,
        Answer(number=5),
    ]
    assert [response.unavailable for response in responses] == [
        False,
        False,
        True,
        False,
        False,
        False,
    ]
    assert (responses[2].error or "").startswith("LLM request failed: ")
    assert (responses[4].error or "").startswith("Failed to parse LLM response: ")
    assert responses[4].raw == "no json"


def test_a_signal_while_the_batch_chat_waits_ends_it_without_waiting_for_requests_in_flight(
    fake_completions: FakeCompletions,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """With two requests in parallel, both hold a request that does not end; a
    signal handler raises in the waiting thread (as a stop of the job does): the
    batch chat raises at once, without waiting for the held requests, and never
    starts the others."""
    monkeypatch.setattr(llm_repo, "BATCH_CHAT_MAX_WORKERS", 2)
    fake_completions.held = {0, 1}

    def _raise(signum: int, frame: FrameType | None) -> None:
        raise InterruptedError("stopped")

    previous = signal.signal(signal.SIGALRM, _raise)
    started_at = time.monotonic()
    try:
        signal.setitimer(signal.ITIMER_REAL, 0.5)
        with pytest.raises(InterruptedError):
            _batch_chat(list(range(10)))
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous)

    assert time.monotonic() - started_at < HOLD_SECONDS / 2
    assert sorted(fake_completions.started) == [0, 1]
