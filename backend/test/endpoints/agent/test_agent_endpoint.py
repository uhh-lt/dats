import asyncio
import json
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic_ai.exceptions import ModelHTTPError
from pydantic_ai.messages import ModelMessage, ModelResponse

from core.project.project_orm import ProjectORM
from modules.agent.agent_dto import (
    AgentQueryRequest,
    AgentQueryResponse,
    AgentSessionHistory,
    AgentToolRead,
)
from modules.agent.agent_enum import AgentName
from modules.agent.agent_session_dto import AgentSessionRead, AgentSessionUpdate
from modules.agent.agent_session_orm import AgentSessionORM
from modules.agent.agui_adapter import TOOL_DENIED_MESSAGE

from .conftest import (
    GENERATED_TITLE,
    AgentSessionState,
    Respond,
    last_tool_return,
    text,
    tool_call,
)

# The router prefixes of each agent's tools: the tool names start with them.
AGENT_TOOL_PREFIXES = {
    AgentName.PROJECT: {
        "project",
        "code",
        "tag",
        "projectMetadata",
        "folder",
        "memo",
        "user",
        "search",
    },
    AgentName.SOURCE_DOCUMENT: {
        "sourceDocument",
        "sdocMetadata",
        "spanAnnotation",
        "bboxAnnotation",
        "sentenceAnnotation",
        "code",
        "tag",
        "search",
    },
}


def _get_sessions(client: TestClient, project_id: int) -> list[AgentSessionRead]:
    response = client.get(f"/agent/project/{project_id}/sessions")
    assert response.status_code == 200, response.text
    return [AgentSessionRead.model_validate(x) for x in response.json()]


def _get_history(client: TestClient, session_id: str) -> AgentSessionHistory:
    response = client.get(f"/agent/sessions/{session_id}/history")
    assert response.status_code == 200, response.text
    return AgentSessionHistory.model_validate(response.json())


def _project_titles(client: TestClient) -> set[str]:
    response = client.get("/project/user/projects")
    assert response.status_code == 200, response.text
    return {project["title"] for project in response.json()}


def _list_projects(messages: list[ModelMessage]) -> ModelResponse:
    """Scripted model: list the user's projects, then answer with the result."""
    result = last_tool_return(messages)
    if result is None:
        return tool_call("project_get_user_projects", {}, "call-projects")
    return text(f"Your projects: {result.content}")


def _delete_project(project_id: int) -> Respond:
    """Scripted model: delete the project, then report the tool's result."""

    def respond(messages: list[ModelMessage]) -> ModelResponse:
        result = last_tool_return(messages)
        if result is None:
            return tool_call(
                "project_delete_project", {"project_id": project_id}, "call-delete"
            )
        return text(f"Result: {result.content}")

    return respond


# ===========================================================================
# GET SESSIONS (GET /agent/project/{project_id}/sessions) TESTS
# ===========================================================================


def test_get_sessions_returns_own_sessions_of_the_project_most_recently_updated_first(
    client: TestClient, agent_sessions: AgentSessionState
):
    """The test user sees only their own three sessions of the project, newest
    update first, with their agent; the session of the second project is not
    among them."""
    sessions = _get_sessions(client, agent_sessions["test_project"].id)

    assert [s.session_id for s in sessions] == [
        "session-invalid",
        "session-newer",
        "session-older",
    ]
    assert [s.agent_name for s in sessions] == [
        AgentName.PROJECT,
        AgentName.SOURCE_DOCUMENT,
        AgentName.PROJECT,
    ]
    assert {s.user_id for s in sessions} == {agent_sessions["test_user"].id}
    assert {s.project_id for s in sessions} == {agent_sessions["test_project"].id}


def test_get_sessions_of_another_project_of_the_user(
    client: TestClient, agent_sessions: AgentSessionState
):
    """The second project lists only its own session."""
    sessions = _get_sessions(client, agent_sessions["second_project"].id)
    assert [s.session_id for s in sessions] == ["session-elsewhere"]


def test_get_sessions_of_a_user_without_sessions_is_empty(
    client: TestClient, test_project: ProjectORM
):
    """Without the fixture, the test user has no sessions."""
    assert _get_sessions(client, test_project.id) == []


def test_get_sessions_of_a_project_the_user_is_no_member_of_is_forbidden(
    client: TestClient, agent_sessions: AgentSessionState
):
    """The test user is no member of the other user's project -> 403."""
    response = client.get(
        f"/agent/project/{agent_sessions['other_project'].id}/sessions"
    )
    assert response.status_code == 403, response.text


# ===========================================================================
# GET SESSION HISTORY (GET /agent/sessions/{session_id}/history) TESTS
# ===========================================================================


def test_get_session_history_returns_the_messages_as_ag_ui_messages(
    client: TestClient, agent_sessions: AgentSessionState
):
    """The stored prompt and answer come back as AG-UI user and assistant messages."""
    history = _get_history(client, "session-newer")

    assert [(m.role, m.content) for m in history.messages] == [
        ("user", "How many projects?"),
        ("assistant", "You have no projects."),
    ]


def test_get_session_history_reads_the_requesters_session_of_a_shared_id(
    client: TestClient, other_client: TestClient, agent_sessions: AgentSessionState
):
    """Both users own a "session-older"; each one reads their own history."""
    own = _get_history(client, "session-older")
    other = _get_history(other_client, "session-older")

    assert [m.content for m in own.messages] == ["Hello", "Hi there"]
    assert [m.content for m in other.messages] == ["Hello", "Hi"]


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


def test_get_session_history_restores_a_pending_approval_as_interrupt(
    client: TestClient, pending_approval_session: AgentSessionORM
):
    """A run that stopped for the user's approval: the assistant message with
    the tool call carries the AG-UI interrupt in its metadata, where the client
    restores it, with the id the backend expects in the resume."""
    history = _get_history(client, "session-approval")

    assistant = [m for m in history.messages if m.role == "assistant"][-1]
    assert [c.id for c in assistant.tool_calls or []] == ["call-delete"]
    assert assistant.metadata is not None
    interrupts = assistant.metadata["custom"]["agui"]["interrupts"]
    assert [(i["id"], i["reason"], i["toolCallId"]) for i in interrupts] == [
        ("int-call-delete", "tool_call", "call-delete")
    ]


def test_get_session_history_without_pending_approval_has_no_interrupts(
    client: TestClient, agent_sessions: AgentSessionState
):
    """A finished conversation restores without interrupts."""
    history = _get_history(client, "session-newer")
    assert all(getattr(m, "metadata", None) is None for m in history.messages)


def test_get_session_history_with_unparsable_messages_fails(
    client: TestClient, agent_sessions: AgentSessionState
):
    """Stored messages pydantic-ai cannot parse raise an error instead of being
    treated as an empty history (which a new run would then overwrite)."""
    response = client.get("/agent/sessions/session-invalid/history")
    assert response.status_code == 500, response.text
    assert "session-invalid" in response.text


# ===========================================================================
# GET TOOLS (GET /agent/{agent_name}/tools) TESTS
# ===========================================================================


def _get_tools(client: TestClient, agent_name: str) -> dict[str, AgentToolRead]:
    response = client.get(f"/agent/{agent_name}/tools")
    assert response.status_code == 200, response.text
    tools = [AgentToolRead.model_validate(x) for x in response.json()]
    return {tool.name: tool for tool in tools}


@pytest.mark.parametrize(
    "agent_name",
    [
        pytest.param(AgentName.PROJECT, id="project"),
        pytest.param(AgentName.SOURCE_DOCUMENT, id="source-document"),
    ],
)
def test_get_tools_has_tools_of_exactly_the_agents_routers(
    client: TestClient, agent_name: AgentName
):
    """Every router of the agent contributes tools (a misspelled tag would
    not), and no other router does."""
    tools = _get_tools(client, agent_name.value)
    assert {name.split("_", 1)[0] for name in tools} == AGENT_TOOL_PREFIXES[agent_name]


def test_get_tools_marks_the_tools_that_need_approval(client: TestClient):
    """Deletes and bulk overwrites need the user's approval, reads and single
    updates do not; each tool is described by the summary of its endpoint."""
    tools = _get_tools(client, "project")
    assert tools["project_delete_project"].needs_approval
    assert tools["tag_update_tags_batch"].needs_approval
    assert not tools["project_update_project"].needs_approval
    assert not tools["project_get_project"].needs_approval
    assert tools["project_get_project"].description


def test_get_tools_of_an_unknown_agent_is_rejected(client: TestClient):
    """Only the AgentName values are agents -> 422 otherwise."""
    response = client.get("/agent/title_generator/tools")
    assert response.status_code == 422, response.text


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
    other_titles = {
        s.session_id: s.title
        for s in _get_sessions(other_client, agent_sessions["other_project"].id)
    }
    assert other_titles["session-older"] == "Other Older Session"


@pytest.mark.parametrize(
    "body",
    [
        # An empty update sets no field.
        pytest.param({}, id="no-fields"),
        # A session always has a title.
        pytest.param({"title": None}, id="null-title"),
        pytest.param({"title": ""}, id="empty-title"),
    ],
)
def test_update_session_with_invalid_fields_is_rejected(
    client: TestClient, agent_sessions: AgentSessionState, body: dict[str, Any]
):
    """Invalid updates -> 422."""
    response = client.patch("/agent/sessions/session-older", json=body)
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
    assert [
        s.session_id for s in _get_sessions(client, agent_sessions["test_project"].id)
    ] == ["session-invalid", "session-newer"]
    other_ids = {
        s.session_id
        for s in _get_sessions(other_client, agent_sessions["other_project"].id)
    }
    assert "session-older" in other_ids


def test_delete_session_of_another_user_is_not_found(
    client: TestClient, other_client: TestClient, agent_sessions: AgentSessionState
):
    """The test user cannot delete the other user's session -> 404, and it stays."""
    response = client.delete("/agent/sessions/session-other")
    assert response.status_code == 404, response.text
    other_ids = {
        s.session_id
        for s in _get_sessions(other_client, agent_sessions["other_project"].id)
    }
    assert "session-other" in other_ids


# ===========================================================================
# ASK AGENT (POST /agent/project/{project_id}/{agent_name}) TESTS
# ===========================================================================
# The agents run on the scripted model (see conftest); their tool calls are
# real requests made with the caller's credentials.


def _ask(
    client: TestClient,
    project_id: int,
    query: AgentQueryRequest,
    agent_name: str = "project",
) -> AgentQueryResponse:
    response = client.post(
        f"/agent/project/{project_id}/{agent_name}", json=query.model_dump()
    )
    assert response.status_code == 200, response.text
    return AgentQueryResponse.model_validate(response.json())


# --- A. answers, tools and sessions --------------------------------------------


def test_ask_agent_calls_tools_with_the_callers_credentials_and_stores_the_session(
    client: TestClient,
    test_project: ProjectORM,
    scripted_agent: Callable[[Respond], None],
):
    """The agent's tool call lists the caller's projects; the answer and a new
    session (in the project, with a generated title) come back."""
    scripted_agent(_list_projects)
    answer = _ask(client, test_project.id, AgentQueryRequest(prompt="My projects?"))

    assert "Simple Test Project" in answer.response
    assert answer.tools_used == ["project_get_user_projects"]
    assert answer.approvals_required == []
    assert answer.session.project_id == test_project.id
    assert answer.session.title == GENERATED_TITLE
    assert [s.session_id for s in _get_sessions(client, test_project.id)] == [
        answer.session_id
    ]


def test_ask_agent_runs_of_two_users_at_once_use_their_own_credentials(
    client: TestClient,
    other_client: TestClient,
    agent_sessions: AgentSessionState,
    scripted_agent: Callable[[Respond], None],
):
    """Two users' runs that overlap (both runs connect their tools before
    either calls one) each list only their own projects."""
    started: dict[str, Any] = {"count": 0, "event": None}

    async def respond(messages: list[ModelMessage]) -> ModelResponse:
        result = last_tool_return(messages)
        if result is not None:
            return text(str(result.content))
        if started["event"] is None:
            started["event"] = asyncio.Event()
        started["count"] += 1
        if started["count"] == 2:
            started["event"].set()
        await asyncio.wait_for(started["event"].wait(), timeout=30)
        return tool_call("project_get_user_projects", {}, "call-projects")

    scripted_agent(respond)
    with ThreadPoolExecutor(max_workers=2) as pool:
        own = pool.submit(
            _ask,
            client,
            agent_sessions["test_project"].id,
            AgentQueryRequest(prompt="My projects?"),
        )
        other = pool.submit(
            _ask,
            other_client,
            agent_sessions["other_project"].id,
            AgentQueryRequest(prompt="My projects?"),
        )
        own_answer, other_answer = own.result(), other.result()

    assert "Simple Test Project" in own_answer.response
    assert "Other Project" not in own_answer.response
    assert "Other Project" in other_answer.response
    assert "Simple Test Project" not in other_answer.response


def test_ask_agent_continues_a_session_with_its_history(
    client: TestClient,
    agent_sessions: AgentSessionState,
    scripted_agent: Callable[[Respond], None],
):
    """The model sees the stored history of "session-older"; the session keeps
    its title."""
    seen: list[int] = []

    def respond(messages: list[ModelMessage]) -> ModelResponse:
        seen.append(len(messages))
        return text("OK")

    scripted_agent(respond)
    answer = _ask(
        client,
        agent_sessions["test_project"].id,
        AgentQueryRequest(session_id="session-older", prompt="Again"),
    )

    # the stored prompt and answer, and the new prompt
    assert seen == [3]
    assert answer.session.title == "Older Session"
    assert [m.content for m in _get_history(client, "session-older").messages] == [
        "Hello",
        "Hi there",
        "Again",
        "OK",
    ]


def test_ask_agent_with_a_session_of_another_project_is_a_conflict(
    client: TestClient,
    agent_sessions: AgentSessionState,
    scripted_agent: Callable[[Respond], None],
):
    """Session ids are unique per user, but a session belongs to one project:
    the second project's session cannot be continued in the first -> 409."""
    scripted_agent(lambda messages: text("unused"))
    response = client.post(
        f"/agent/project/{agent_sessions['test_project'].id}/project",
        json=AgentQueryRequest(
            session_id="session-elsewhere", prompt="Hi"
        ).model_dump(),
    )
    assert response.status_code == 409, response.text
    assert "session-elsewhere" in response.text


def test_ask_agent_in_a_project_the_user_is_no_member_of_is_forbidden(
    client: TestClient,
    agent_sessions: AgentSessionState,
    scripted_agent: Callable[[Respond], None],
):
    """The test user cannot run an agent in the other user's project -> 403."""
    scripted_agent(lambda messages: text("unused"))
    response = client.post(
        f"/agent/project/{agent_sessions['other_project'].id}/project",
        json=AgentQueryRequest(prompt="Hi").model_dump(),
    )
    assert response.status_code == 403, response.text


def test_ask_agent_with_an_unknown_agent_is_rejected(
    client: TestClient, test_project: ProjectORM
):
    """Only the AgentName values are agents -> 422 otherwise."""
    response = client.post(
        f"/agent/project/{test_project.id}/title_generator",
        json=AgentQueryRequest(prompt="Hi").model_dump(),
    )
    assert response.status_code == 422, response.text


# --- B. approvals ----------------------------------------------------------------
# Destructive tools stop the run until the user answers; the REST endpoint can
# only report them (answering works via the AG-UI endpoint).


def test_ask_agent_destructive_tool_waits_for_approval_and_does_not_run(
    client: TestClient,
    test_project: ProjectORM,
    project_to_delete: ProjectORM,
    scripted_agent: Callable[[Respond], None],
):
    """The delete is reported as waiting for approval, not as used, and the
    project still exists."""
    scripted_agent(_delete_project(project_to_delete.id))
    answer = _ask(client, test_project.id, AgentQueryRequest(prompt="Delete it"))

    assert answer.approvals_required == ["project_delete_project"]
    assert answer.tools_used == []
    assert "Project To Delete" in _project_titles(client)


def test_ask_agent_in_a_session_waiting_for_approval_is_a_conflict(
    client: TestClient,
    test_project: ProjectORM,
    pending_approval_session: AgentSessionORM,
    scripted_agent: Callable[[Respond], None],
):
    """A new prompt cannot follow unanswered approvals -> 409 that says so."""
    scripted_agent(lambda messages: text("unused"))
    response = client.post(
        f"/agent/project/{test_project.id}/project",
        json=AgentQueryRequest(session_id="session-approval", prompt="Hi").model_dump(),
    )
    assert response.status_code == 409, response.text
    assert "approval" in response.text


# --- C. failures -------------------------------------------------------------------
# The client learns which LLM failed, never the provider's own message.


def test_ask_agent_with_a_failing_llm_names_the_llm_but_not_the_providers_message(
    client: TestClient,
    test_project: ProjectORM,
    scripted_agent: Callable[[Respond], None],
):
    """A provider error -> 502 with the LLM and the HTTP status only."""

    def respond(messages: list[ModelMessage]) -> ModelResponse:
        raise ModelHTTPError(
            status_code=500, model_name="scripted", body={"error": "secret internals"}
        )

    scripted_agent(respond)
    response = client.post(
        f"/agent/project/{test_project.id}/project",
        json=AgentQueryRequest(prompt="Hi").model_dump(),
    )
    assert response.status_code == 502, response.text
    assert "The LLM 'scripted' failed to answer (HTTP 500)" in response.text
    assert "secret internals" not in response.text


def test_ask_agent_with_an_llm_that_keeps_calling_a_tool_wrongly_fails_clearly(
    client: TestClient,
    test_project: ProjectORM,
    scripted_agent: Callable[[Respond], None],
):
    """Invalid tool arguments every time -> 502 after the retries."""
    scripted_agent(
        lambda messages: tool_call("project_get_project", {"wrong": 1}, "call-wrong")
    )
    response = client.post(
        f"/agent/project/{test_project.id}/project",
        json=AgentQueryRequest(prompt="Hi").model_dump(),
    )
    assert response.status_code == 502, response.text
    assert "could not call a tool correctly" in response.text


@pytest.mark.llm
def test_ask_agent_with_an_unknown_model_is_rejected(
    client: TestClient, test_project: ProjectORM
):
    """A model the provider does not serve -> 400, before the agent runs (needs
    the provider's model list)."""
    response = client.post(
        f"/agent/project/{test_project.id}/project",
        json=AgentQueryRequest(prompt="Hi").model_dump(),
        params={"model": "no-such-model"},
    )
    assert response.status_code == 400, response.text
    assert "no-such-model" in response.text


@pytest.mark.llm
def test_ask_agent_with_the_real_llm_continues_a_titled_session(
    client: TestClient, test_project: ProjectORM
):
    """With the provider's default LLM: the second prompt of a session sees
    the first one, and the session gets a title."""
    first = _ask(
        client,
        test_project.id,
        AgentQueryRequest(prompt="Remember the word 'pineapple'. Reply OK."),
    )
    second = _ask(
        client,
        test_project.id,
        AgentQueryRequest(
            session_id=first.session_id,
            prompt="Which word did I ask you to remember? Answer with the word only.",
        ),
    )

    assert second.session_id == first.session_id
    assert "pineapple" in second.response.lower()
    assert first.session.title


# ===========================================================================
# ASK AG-UI AGENT (POST /agent/project/{project_id}/{agent_name}/agui) TESTS
# ===========================================================================


def _run_agui(
    client: TestClient,
    project_id: int,
    thread_id: str,
    messages: list[dict[str, Any]],
    resume: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """POST an AG-UI run and return its events."""
    body: dict[str, Any] = {
        "threadId": thread_id,
        "runId": f"run-{len(messages)}",
        "state": {},
        "messages": messages,
        "tools": [],
        "context": [],
    }
    if resume is not None:
        body["resume"] = resume
    response = client.post(
        f"/agent/project/{project_id}/project/agui",
        headers={"Accept": "text/event-stream"},
        json=body,
    )
    assert response.status_code == 200, response.text
    return [
        json.loads(line.removeprefix("data: "))
        for line in response.text.splitlines()
        if line.startswith("data: ")
    ]


def _answer_text(events: list[dict[str, Any]]) -> str:
    return "".join(e["delta"] for e in events if e["type"] == "TEXT_MESSAGE_CONTENT")


def _agui_body(thread_id: str) -> dict[str, Any]:
    return {
        "threadId": thread_id,
        "runId": "run-1",
        "state": {},
        "messages": [{"id": "m1", "role": "user", "content": "Hi"}],
        "tools": [],
        "context": [],
    }


# --- A. answers and sessions -----------------------------------------------------


def test_ask_agui_agent_streams_the_answer_and_stores_a_titled_session(
    client: TestClient,
    test_project: ProjectORM,
    scripted_agent: Callable[[Respond], None],
):
    """The run streams the tool call and the answer; the session is stored in
    the project and gets its generated title after the answer."""
    scripted_agent(_list_projects)
    prompt = {"id": "m1", "role": "user", "content": "My projects?"}
    events = _run_agui(client, test_project.id, "agui-thread", [prompt])

    assert events[-1]["type"] == "RUN_FINISHED"
    assert "Simple Test Project" in _answer_text(events)
    sessions = _get_sessions(client, test_project.id)
    assert [(s.session_id, s.title) for s in sessions] == [
        ("agui-thread", GENERATED_TITLE)
    ]
    # a stored run starts with the agent's system prompt
    history = _get_history(client, "agui-thread")
    roles = [m.role for m in history.messages if m.role != "system"]
    assert roles == ["user", "assistant", "tool", "assistant"]


def test_ask_agui_agent_with_a_failing_llm_sends_a_safe_error_and_keeps_the_prompt(
    client: TestClient,
    test_project: ProjectORM,
    scripted_agent: Callable[[Respond], None],
):
    """A provider error ends the run with RUN_ERROR naming the LLM only; the
    prompt was stored before the run, so the session keeps it."""

    def respond(messages: list[ModelMessage]) -> ModelResponse:
        raise ModelHTTPError(
            status_code=500, model_name="scripted", body={"error": "secret internals"}
        )

    scripted_agent(respond)
    prompt = {"id": "m1", "role": "user", "content": "Hello agent"}
    events = _run_agui(client, test_project.id, "agui-failing", [prompt])

    errors = [e for e in events if e["type"] == "RUN_ERROR"]
    assert [e["message"] for e in errors] == [
        "The LLM 'scripted' failed to answer (HTTP 500). Try another LLM."
    ]
    assert "secret internals" not in json.dumps(events)
    history = _get_history(client, "agui-failing")
    assert [(m.role, m.content) for m in history.messages] == [("user", "Hello agent")]


def test_ask_agui_agent_with_a_session_of_another_project_is_a_conflict(
    client: TestClient,
    agent_sessions: AgentSessionState,
    scripted_agent: Callable[[Respond], None],
):
    """The second project's session cannot be continued in the first -> 409."""
    scripted_agent(lambda messages: text("unused"))
    response = client.post(
        f"/agent/project/{agent_sessions['test_project'].id}/project/agui",
        headers={"Accept": "text/event-stream"},
        json=_agui_body("session-elsewhere"),
    )
    assert response.status_code == 409, response.text


def test_ask_agui_agent_with_a_too_long_thread_id_is_rejected(
    client: TestClient,
    test_project: ProjectORM,
    scripted_agent: Callable[[Respond], None],
):
    """Thread ids become session ids, which have at most 128 characters -> 400."""
    scripted_agent(lambda messages: text("unused"))
    response = client.post(
        f"/agent/project/{test_project.id}/project/agui",
        headers={"Accept": "text/event-stream"},
        json=_agui_body("x" * 129),
    )
    assert response.status_code == 400, response.text


# --- B. approvals ----------------------------------------------------------------
# A destructive tool ends the run with an interrupt; the next run answers it
# (resume) with the whole thread, as the AG-UI client does.


def _interrupted_delete_run(
    client: TestClient, project_id: int, thread_id: str
) -> list[dict[str, Any]]:
    """Run the agent until the delete waits for approval; return the thread."""
    prompt = {"id": "m1", "role": "user", "content": "Delete the project"}
    events = _run_agui(client, project_id, thread_id, [prompt])
    finished = events[-1]
    assert finished["type"] == "RUN_FINISHED"
    assert finished["outcome"]["type"] == "interrupt"
    assert [i["toolCallId"] for i in finished["outcome"]["interrupts"]] == [
        "call-delete"
    ]
    return [
        m.model_dump(mode="json", by_alias=True, exclude_none=True)
        for m in _get_history(client, thread_id).messages
    ]


def test_ask_agui_agent_approved_destructive_tool_runs(
    client: TestClient,
    test_project: ProjectORM,
    project_to_delete: ProjectORM,
    scripted_agent: Callable[[Respond], None],
):
    """The project survives until the user approves; then it is deleted."""
    scripted_agent(_delete_project(project_to_delete.id))
    thread = _interrupted_delete_run(client, test_project.id, "agui-approve")
    assert "Project To Delete" in _project_titles(client)

    events = _run_agui(
        client,
        test_project.id,
        "agui-approve",
        thread,
        resume=[
            {
                "interruptId": "int-call-delete",
                "status": "resolved",
                "payload": {"approved": True},
            }
        ],
    )

    assert events[-1]["type"] == "RUN_FINISHED"
    assert "Project To Delete" not in _project_titles(client)


def test_ask_agui_agent_denied_destructive_tool_does_not_run(
    client: TestClient,
    test_project: ProjectORM,
    project_to_delete: ProjectORM,
    scripted_agent: Callable[[Respond], None],
):
    """A denied delete does not run; the agent gets TOOL_DENIED_MESSAGE as the
    tool's result."""
    scripted_agent(_delete_project(project_to_delete.id))
    thread = _interrupted_delete_run(client, test_project.id, "agui-deny")

    events = _run_agui(
        client,
        test_project.id,
        "agui-deny",
        thread,
        resume=[
            {
                "interruptId": "int-call-delete",
                "status": "resolved",
                "payload": {"approved": False},
            }
        ],
    )

    assert events[-1]["type"] == "RUN_FINISHED"
    assert TOOL_DENIED_MESSAGE in _answer_text(events)
    assert "Project To Delete" in _project_titles(client)


@pytest.mark.llm
def test_ask_agui_agent_with_the_real_llm_stores_the_thread_without_duplicates(
    client: TestClient, test_project: ProjectORM
):
    """With the provider's default LLM: AG-UI clients send the whole thread with
    every run. After two runs, the stored history holds each prompt once."""
    first_prompt = {"id": "m1", "role": "user", "content": "Say hi."}
    events = _run_agui(client, test_project.id, "agui-thread", [first_prompt])
    assert events[-1]["type"] == "RUN_FINISHED"

    second_prompt = {"id": "m3", "role": "user", "content": "Say bye."}
    events = _run_agui(
        client,
        test_project.id,
        "agui-thread",
        [
            first_prompt,
            {"id": "m2", "role": "assistant", "content": _answer_text(events)},
            second_prompt,
        ],
    )
    assert events[-1]["type"] == "RUN_FINISHED"

    history = _get_history(client, "agui-thread")
    assert [m.content for m in history.messages if m.role == "user"] == [
        "Say hi.",
        "Say bye.",
    ]
