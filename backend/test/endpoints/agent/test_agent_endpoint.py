import json

import pytest
from fastapi.testclient import TestClient

from modules.agent.agent_dto import (
    AgentQueryRequest,
    AgentQueryResponse,
    AgentSessionHistory,
)
from modules.agent.agent_session_dto import AgentSessionRead, AgentSessionUpdate

from .conftest import AgentSessionState

# ===========================================================================
# GET SESSIONS (GET /agent/sessions) TESTS
# ===========================================================================


def _get_sessions(client: TestClient) -> list[AgentSessionRead]:
    response = client.get("/agent/sessions")
    assert response.status_code == 200, response.text
    return [AgentSessionRead.model_validate(x) for x in response.json()]


def test_get_sessions_returns_own_sessions_most_recently_updated_first(
    client: TestClient, agent_sessions: AgentSessionState
):
    """The test user sees only their own three sessions, newest update first."""
    sessions = _get_sessions(client)

    assert [s.session_id for s in sessions] == [
        "session-invalid",
        "session-newer",
        "session-older",
    ]
    assert [s.title for s in sessions] == [
        "Broken Session",
        "Newer Session",
        "Older Session",
    ]
    assert {s.user_id for s in sessions} == {agent_sessions["test_user"].id}


def test_get_sessions_of_a_user_without_sessions_is_empty(client: TestClient):
    """Without the fixture, the test user has no sessions."""
    assert _get_sessions(client) == []


# ===========================================================================
# GET SESSION HISTORY (GET /agent/sessions/{session_id}/history) TESTS
# ===========================================================================


def test_get_session_history_returns_the_messages_as_ag_ui_messages(
    client: TestClient, agent_sessions: AgentSessionState
):
    """The stored prompt and answer come back as AG-UI user and assistant messages."""
    response = client.get("/agent/sessions/session-newer/history")
    assert response.status_code == 200, response.text
    history = AgentSessionHistory.model_validate(response.json())

    assert [(m["role"], m["content"]) for m in history.messages] == [
        ("user", "How many projects?"),
        ("assistant", "You have no projects."),
    ]


def test_get_session_history_reads_the_requesters_session_of_a_shared_id(
    client: TestClient, other_client: TestClient, agent_sessions: AgentSessionState
):
    """Both users own a "session-older"; each one reads their own history."""
    own = client.get("/agent/sessions/session-older/history")
    other = other_client.get("/agent/sessions/session-older/history")
    assert own.status_code == 200, own.text
    assert other.status_code == 200, other.text

    own_answers = [m["content"] for m in own.json()["messages"]]
    other_answers = [m["content"] for m in other.json()["messages"]]
    assert own_answers == ["Hello", "Hi there"]
    assert other_answers == ["Hello", "Hi"]


@pytest.mark.parametrize(
    "session_id",
    [
        # Another user's session is indistinguishable from a missing one.
        pytest.param("session-other", id="other-users-session"),
        pytest.param("session-missing", id="nonexistent-session"),
    ],
)
def test_get_session_history_of_an_unknown_session_is_not_found(
    client: TestClient, agent_sessions: AgentSessionState, session_id: str
):
    """Only the requester's own sessions can be read -> 404 otherwise."""
    response = client.get(f"/agent/sessions/{session_id}/history")
    assert response.status_code == 404, response.text


def test_get_session_history_with_unparsable_messages_fails(
    client: TestClient, agent_sessions: AgentSessionState
):
    """Stored messages pydantic-ai cannot parse raise an error instead of being
    treated as an empty history (which a new run would then overwrite)."""
    response = client.get("/agent/sessions/session-invalid/history")
    assert response.status_code == 500, response.text
    assert "session-invalid" in response.text


# ===========================================================================
# UPDATE SESSION (PATCH /agent/sessions/{session_id}) TESTS
# ===========================================================================


def test_update_session_renames_only_the_requesters_session(
    client: TestClient, other_client: TestClient, agent_sessions: AgentSessionState
):
    """Renaming "session-older" changes the test user's session; the other user's
    session with the same id keeps its title."""
    response = client.patch(
        "/agent/sessions/session-older",
        json=AgentSessionUpdate(title="Renamed").model_dump(exclude_unset=True),
    )
    assert response.status_code == 200, response.text
    updated = AgentSessionRead.model_validate(response.json())

    assert updated.id == agent_sessions["session_older"].id
    assert updated.title == "Renamed"
    titles = {s.session_id: s.title for s in _get_sessions(other_client)}
    assert titles["session-older"] == "Other Older Session"


def test_update_session_without_fields_is_rejected(
    client: TestClient, agent_sessions: AgentSessionState
):
    """An empty update sets no field -> 422."""
    response = client.patch("/agent/sessions/session-older", json={})
    assert response.status_code == 422, response.text


def test_update_session_of_another_user_is_not_found(
    client: TestClient, agent_sessions: AgentSessionState
):
    """The test user cannot rename the other user's session -> 404."""
    response = client.patch("/agent/sessions/session-other", json={"title": "Mine"})
    assert response.status_code == 404, response.text


# ===========================================================================
# DELETE SESSION (DELETE /agent/sessions/{session_id}) TESTS
# ===========================================================================


def test_delete_session_returns_and_removes_only_the_requesters_session(
    client: TestClient, other_client: TestClient, agent_sessions: AgentSessionState
):
    """Deleting "session-older" returns the deleted session and removes it from
    the test user's list; the other user's "session-older" survives."""
    session_older_id = agent_sessions["session_older"].id
    response = client.delete("/agent/sessions/session-older")
    assert response.status_code == 200, response.text
    deleted = AgentSessionRead.model_validate(response.json())

    assert deleted.id == session_older_id
    assert [s.session_id for s in _get_sessions(client)] == [
        "session-invalid",
        "session-newer",
    ]
    assert "session-older" in {s.session_id for s in _get_sessions(other_client)}


def test_delete_session_of_another_user_is_not_found(
    client: TestClient, other_client: TestClient, agent_sessions: AgentSessionState
):
    """The test user cannot delete the other user's session -> 404, and it stays."""
    response = client.delete("/agent/sessions/session-other")
    assert response.status_code == 404, response.text
    assert "session-other" in {s.session_id for s in _get_sessions(other_client)}


# ===========================================================================
# GET MODELS (GET /agent/models) TESTS
# ===========================================================================


def test_get_models_lists_the_llms_of_the_provider(client: TestClient):
    """The provider serves at least one LLM, the agents' default."""
    response = client.get("/agent/models")
    assert response.status_code == 200, response.text
    models = response.json()
    assert isinstance(models, list) and len(models) > 0


# ===========================================================================
# ASK AGENT (POST /agent/{agent_name}) TESTS
# ===========================================================================
# The test client authenticates by a test header, which the agent's MCP tool
# calls do not forward, so these tests use prompts that need no tools.


def _ask(
    client: TestClient, query: AgentQueryRequest, model: str | None = None
) -> AgentQueryResponse:
    params = {"model": model} if model else {}
    response = client.post("/agent/project", json=query.model_dump(), params=params)
    assert response.status_code == 200, response.text
    return AgentQueryResponse.model_validate(response.json())


def test_ask_agent_with_an_unknown_model_is_rejected(client: TestClient):
    """A model the provider does not serve -> 400, before the agent runs."""
    response = client.post(
        "/agent/project",
        json=AgentQueryRequest(prompt="Hi").model_dump(),
        params={"model": "no-such-model"},
    )
    assert response.status_code == 400, response.text
    assert "no-such-model" in response.text


def test_ask_agent_with_an_unknown_agent_is_rejected(client: TestClient):
    """Only the AgentName values are agents -> 422 otherwise."""
    response = client.post(
        "/agent/title_generator", json=AgentQueryRequest(prompt="Hi").model_dump()
    )
    assert response.status_code == 422, response.text


@pytest.mark.llm
def test_ask_agent_starts_a_titled_session_and_continues_it(client: TestClient):
    """The first prompt starts a new session with a generated title; the second
    prompt in that session sees the first one."""
    first = _ask(
        client, AgentQueryRequest(prompt="Remember the word 'pineapple'. Reply OK.")
    )
    second = _ask(
        client,
        AgentQueryRequest(
            session_id=first.session_id,
            prompt="Which word did I ask you to remember? Answer with the word only.",
        ),
    )

    assert second.session_id == first.session_id
    assert "pineapple" in second.response.lower()
    sessions = _get_sessions(client)
    assert [s.session_id for s in sessions] == [first.session_id]
    assert sessions[0].title
    history = client.get(f"/agent/sessions/{first.session_id}/history").json()
    assert [m["role"] for m in history["messages"] if m["role"] != "system"] == [
        "user",
        "assistant",
        "user",
        "assistant",
    ]


@pytest.mark.llm
def test_ask_agent_with_another_users_session_id_starts_an_own_session(
    client: TestClient, other_client: TestClient, agent_sessions: AgentSessionState
):
    """Reusing the other user's session id starts a new session of the test user
    instead of failing or reading the other user's history."""
    answer = _ask(client, AgentQueryRequest(session_id="session-other", prompt="Hi"))

    assert answer.session_id == "session-other"
    assert "session-other" in {s.session_id for s in _get_sessions(client)}
    assert {s.title for s in _get_sessions(other_client)} >= {"Other Session"}


# ===========================================================================
# ASK AG-UI AGENT (POST /agent/agui/{agent_name}) TESTS
# ===========================================================================


def _run_agui(
    client: TestClient, thread_id: str, messages: list[dict[str, str]]
) -> list[dict]:
    """POST an AG-UI run and return its events."""
    response = client.post(
        "/agent/agui/project",
        headers={"Accept": "text/event-stream"},
        json={
            "threadId": thread_id,
            "runId": f"run-{len(messages)}",
            "state": {},
            "messages": messages,
            "tools": [],
            "context": [],
        },
    )
    assert response.status_code == 200, response.text
    return [
        json.loads(line.removeprefix("data: "))
        for line in response.text.splitlines()
        if line.startswith("data: ")
    ]


@pytest.mark.llm
def test_ask_agui_agent_stores_the_thread_without_duplicates(client: TestClient):
    """AG-UI clients send the whole thread with every run. After two runs, the
    stored history holds each message once."""
    first_prompt = {"id": "m1", "role": "user", "content": "Say hi."}
    events = _run_agui(client, "agui-thread", [first_prompt])
    assert events[-1]["type"] == "RUN_FINISHED"
    answer = "".join(e["delta"] for e in events if e["type"] == "TEXT_MESSAGE_CONTENT")

    second_prompt = {"id": "m3", "role": "user", "content": "Say bye."}
    events = _run_agui(
        client,
        "agui-thread",
        [
            first_prompt,
            {"id": "m2", "role": "assistant", "content": answer},
            second_prompt,
        ],
    )
    assert events[-1]["type"] == "RUN_FINISHED"

    history = client.get("/agent/sessions/agui-thread/history").json()
    user_prompts = [m["content"] for m in history["messages"] if m["role"] == "user"]
    assert user_prompts == ["Say hi.", "Say bye."]
