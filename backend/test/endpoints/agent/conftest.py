import inspect
from collections.abc import AsyncIterator, Awaitable, Callable, Generator
from typing import Any, TypedDict

import pytest
from fastapi.testclient import TestClient
from pydantic_ai.messages import (
    ModelMessage,
    ModelMessagesTypeAdapter,
    ModelRequest,
    ModelResponse,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)
from pydantic_ai.models.function import AgentInfo, DeltaToolCall, FunctionModel
from sqlalchemy.orm import Session

import dats_test_utils
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM
from modules.agent import auth_context_utils
from modules.agent.agent_enum import AgentName
from modules.agent.agent_service import AgentService
from modules.agent.agent_session_crud import crud_agent_session
from modules.agent.agent_session_dto import AgentSessionCreate
from modules.agent.agent_session_orm import AgentSessionORM

# The title the scripted model gives every new session.
GENERATED_TITLE = "Generated Title"

# Decides the scripted model's next response from the messages so far.
Respond = Callable[[list[ModelMessage]], ModelResponse | Awaitable[ModelResponse]]


def _conversation(prompt: str, answer: str) -> list[dict[str, Any]]:
    """One user prompt and one agent answer, serialized like the service stores them."""
    return ModelMessagesTypeAdapter.dump_python(
        [
            ModelRequest(parts=[UserPromptPart(content=prompt)]),
            ModelResponse(parts=[TextPart(content=answer)]),
        ],
        mode="json",
    )


def _create_project(db: Session, user: UserORM, title: str) -> ProjectORM:
    project = ProjectService().create_project(
        db=db,
        create_dto=ProjectCreate(title=title, description=f"{title} for testing"),
        creating_user_id=user.id,
    )
    db.commit()
    return crud_project.read(db=db, id=project.id)


def _create_session(
    db: Session,
    *,
    user: UserORM,
    project: ProjectORM,
    session_id: str,
    title: str,
    messages: list[dict[str, Any]],
    agent_name: AgentName = AgentName.PROJECT,
) -> AgentSessionORM:
    db_obj = crud_agent_session.create(
        db=db,
        create_dto=AgentSessionCreate(
            session_id=session_id,
            title=title,
            user_id=user.id,
            project_id=project.id,
            agent_name=agent_name,
            messages=messages,
        ),
    )
    # commit each session on its own, so `now()` (the transaction start)
    # gives every session its own `updated` timestamp
    db.commit()
    db.refresh(db_obj)
    return db_obj


class AgentSessionState(TypedDict):
    test_user: UserORM
    test_project: ProjectORM
    second_project: ProjectORM
    session_older: AgentSessionORM
    session_newer: AgentSessionORM
    session_invalid: AgentSessionORM
    session_elsewhere: AgentSessionORM
    other_user: UserORM
    other_project: ProjectORM
    other_session_same_id: AgentSessionORM
    other_session: AgentSessionORM


@pytest.fixture(scope="function")
def agent_sessions(
    db_session: Session, test_user: UserORM, test_project: ProjectORM
) -> AgentSessionState:
    """This fixture sets up the following agent sessions (a session belongs to
    a user and a project):

    - The primary test user (from the root `test_user` fixture) is a member of
      "Simple Test Project" (root `test_project`) and of a second project
      "Second Project". The user owns four sessions:
      - in "Simple Test Project":
        - "session-older", title "Older Session", project agent: prompt
          "Hello", answer "Hi there".
        - "session-newer", title "Newer Session", source document agent:
          prompt "How many projects?", answer "You have no projects."
        - "session-invalid", title "Broken Session", project agent: its stored
          messages are `[{"kind": "garbage"}]`, which pydantic-ai cannot parse.
      - in "Second Project":
        - "session-elsewhere", title "Elsewhere Session", project agent:
          prompt "Hi", answer "Hello".
    - A second user "Other User" (email "other@dats.org") is a member of their
      own project "Other Project" only, and owns two sessions there, both with
      the project agent:
      - "session-older", title "Other Older Session": the SAME session id as the
        test user's first session (session ids are unique per user only).
      - "session-other", title "Other Session".

    The sessions are created in the order listed (the test user's first), each
    in its own transaction, so their `updated` timestamps follow that order.

    Non-obvious derived behavior:
    - `GET /agent/project/{id}/sessions` lists the requester's sessions of that
      project, the most recently updated first: the test user sees
      "session-invalid", "session-newer", "session-older" in "Simple Test
      Project" and only "session-elsewhere" in "Second Project".
    - Sessions of the other user are invisible to the test user: reading,
      renaming or deleting "session-other" as the test user yields 404, exactly
      like a nonexistent id. "session-older" always means the requester's own.
    - The test user is no member of "Other Project": listing its sessions
      yields 403.
    """
    second_project = _create_project(db_session, test_user, "Second Project")
    other_user = crud_user.create(
        db=db_session,
        create_dto=UserCreate(
            first_name="Other",
            last_name="User",
            email="other@dats.org",
            password="OtherPassword123",
        ),
    )
    db_session.commit()
    other_project = _create_project(db_session, other_user, "Other Project")

    return {
        "test_user": test_user,
        "test_project": test_project,
        "second_project": second_project,
        "session_older": _create_session(
            db_session,
            user=test_user,
            project=test_project,
            session_id="session-older",
            title="Older Session",
            messages=_conversation("Hello", "Hi there"),
        ),
        "session_newer": _create_session(
            db_session,
            user=test_user,
            project=test_project,
            session_id="session-newer",
            title="Newer Session",
            messages=_conversation("How many projects?", "You have no projects."),
            agent_name=AgentName.SOURCE_DOCUMENT,
        ),
        "session_invalid": _create_session(
            db_session,
            user=test_user,
            project=test_project,
            session_id="session-invalid",
            title="Broken Session",
            messages=[{"kind": "garbage"}],
        ),
        "session_elsewhere": _create_session(
            db_session,
            user=test_user,
            project=second_project,
            session_id="session-elsewhere",
            title="Elsewhere Session",
            messages=_conversation("Hi", "Hello"),
        ),
        "other_user": other_user,
        "other_project": other_project,
        "other_session_same_id": _create_session(
            db_session,
            user=other_user,
            project=other_project,
            session_id="session-older",
            title="Other Older Session",
            messages=_conversation("Hello", "Hi"),
        ),
        "other_session": _create_session(
            db_session,
            user=other_user,
            project=other_project,
            session_id="session-other",
            title="Other Session",
            messages=_conversation("Hey", "Hey"),
        ),
    }


@pytest.fixture(scope="function")
def pending_approval_session(
    db_session: Session, test_user: UserORM, test_project: ProjectORM
) -> AgentSessionORM:
    """The test user owns one session "session-approval" (title "Approval
    Session", project agent) in "Simple Test Project", whose run stopped for the
    user's approval: the prompt "Delete project 7" was answered with one tool
    call `project_delete_project` (tool call id "call-delete", args
    `{"project_id": 7}`) that has no result yet."""
    return _create_session(
        db_session,
        user=test_user,
        project=test_project,
        session_id="session-approval",
        title="Approval Session",
        messages=ModelMessagesTypeAdapter.dump_python(
            [
                ModelRequest(parts=[UserPromptPart(content="Delete project 7")]),
                ModelResponse(
                    parts=[
                        ToolCallPart(
                            tool_name="project_delete_project",
                            args={"project_id": 7},
                            tool_call_id="call-delete",
                        )
                    ]
                ),
            ],
            mode="json",
        ),
    )


@pytest.fixture(scope="function")
def project_to_delete(db_session: Session, test_user: UserORM) -> ProjectORM:
    """A project "Project To Delete" of the test user, for the agent's
    destructive tool calls."""
    return _create_project(db_session, test_user, "Project To Delete")


@pytest.fixture(scope="function")
def other_client(
    app_client: TestClient, agent_sessions: AgentSessionState
) -> Generator[TestClient, Any, None]:
    """A client that sends its requests as the other user of `agent_sessions`."""
    c = dats_test_utils.create_user_client(app_client, agent_sessions["other_user"])
    yield c
    c.close()


# ---------------------------------------------------------------------------
# Scripted model: the agents run on a pydantic-ai FunctionModel instead of the
# LLM provider. Their tool calls are real requests to the app, made with the
# caller's test header.
# ---------------------------------------------------------------------------


def tool_call(tool_name: str, args: dict[str, Any], tool_call_id: str) -> ModelResponse:
    """A model response that calls one tool."""
    return ModelResponse(
        parts=[ToolCallPart(tool_name=tool_name, args=args, tool_call_id=tool_call_id)]
    )


def text(content: str) -> ModelResponse:
    """A model response with a text answer."""
    return ModelResponse(parts=[TextPart(content=content)])


def last_tool_return(messages: list[ModelMessage]) -> ToolReturnPart | None:
    """The result of the agent's last tool call, if the last request carries one."""
    last = messages[-1]
    if not isinstance(last, ModelRequest):
        return None
    returns = [part for part in last.parts if isinstance(part, ToolReturnPart)]
    return returns[-1] if returns else None


def _is_title_request(messages: list[ModelMessage]) -> bool:
    first = messages[0]
    return isinstance(first, ModelRequest) and any(
        isinstance(part, UserPromptPart)
        and isinstance(part.content, str)
        and part.content.startswith("Generate a title")
        for part in first.parts
    )


def _scripted_model(respond: Respond) -> FunctionModel:
    async def function(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        # the title agent asks for JSON (PromptedOutput)
        if _is_title_request(messages):
            return text(f'{{"title": "{GENERATED_TITLE}"}}')
        response = respond(messages)
        return await response if inspect.isawaitable(response) else response

    async def stream_function(
        messages: list[ModelMessage], info: AgentInfo
    ) -> AsyncIterator[str | dict[int, DeltaToolCall]]:
        response = await function(messages, info)
        calls = [part for part in response.parts if isinstance(part, ToolCallPart)]
        if calls:
            yield {
                index: DeltaToolCall(
                    name=call.tool_name,
                    json_args=call.args_as_json_str(),
                    tool_call_id=call.tool_call_id,
                )
                for index, call in enumerate(calls)
            }
            return
        yield "".join(
            part.content for part in response.parts if isinstance(part, TextPart)
        )

    return FunctionModel(
        function, stream_function=stream_function, model_name="scripted"
    )


@pytest.fixture(scope="function")
def scripted_agent(monkeypatch: pytest.MonkeyPatch) -> Callable[[Respond], None]:
    """Run the agents (and the session titles) on a scripted model: call the
    returned function with a `respond(messages)` that decides each response.
    New sessions get the title GENERATED_TITLE. The agents' tool calls forward
    the test clients' auth header."""
    monkeypatch.setattr(
        auth_context_utils,
        "FORWARDED_HEADERS",
        (*auth_context_utils.FORWARDED_HEADERS, dats_test_utils.TEST_USER_HEADER),
    )

    def use(respond: Respond) -> None:
        model = _scripted_model(respond)

        async def resolve_model(self: AgentService, model_name: str) -> FunctionModel:
            return model

        monkeypatch.setattr(AgentService, "_resolve_model", resolve_model)

    return use
