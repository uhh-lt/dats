from collections.abc import Generator
from typing import Any, TypedDict

import pytest
from fastapi.testclient import TestClient
from pydantic_ai.messages import (
    ModelMessagesTypeAdapter,
    ModelRequest,
    ModelResponse,
    TextPart,
    UserPromptPart,
)

import dats_test_utils
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM
from modules.agent.agent_session_crud import crud_agent_session
from modules.agent.agent_session_dto import AgentSessionCreate
from modules.agent.agent_session_orm import AgentSessionORM


def _conversation(prompt: str, answer: str) -> list[dict[str, Any]]:
    """One user prompt and one agent answer, serialized like the service stores them."""
    return ModelMessagesTypeAdapter.dump_python(
        [
            ModelRequest(parts=[UserPromptPart(content=prompt)]),
            ModelResponse(parts=[TextPart(content=answer)]),
        ],
        mode="json",
    )


class AgentSessionState(TypedDict):
    test_user: UserORM
    session_older: AgentSessionORM
    session_newer: AgentSessionORM
    session_invalid: AgentSessionORM
    other_user: UserORM
    other_session_same_id: AgentSessionORM
    other_session: AgentSessionORM


@pytest.fixture(scope="function")
def agent_sessions(db_session, test_user) -> AgentSessionState:
    """This fixture sets up the following agent sessions (agent sessions belong to
    users, not to projects):

    - The primary test user (from the root `test_user` fixture) owns three sessions:
      - "session-older", title "Older Session": prompt "Hello", answer "Hi there".
      - "session-newer", title "Newer Session": prompt "How many projects?",
        answer "You have no projects."
      - "session-invalid", title "Broken Session": its stored messages are
        `[{"kind": "garbage"}]`, which pydantic-ai cannot parse.
    - A second user "Other User" (email "other@dats.org") owns two sessions:
      - "session-older", title "Other Older Session": the SAME session id as the
        test user's first session (session ids are unique per user only).
      - "session-other", title "Other Session".

    The sessions are created in the order listed (the test user's first), each in
    its own transaction, so their `updated` timestamps follow that order.

    Non-obvious derived behavior:
    - `GET /agent/sessions` lists the most recently updated session first, so the
      test user sees "session-invalid", "session-newer", "session-older".
    - Sessions of the other user are invisible to the test user: reading, renaming
      or deleting "session-other" as the test user yields 404, exactly like a
      nonexistent id. "session-older" always means the requester's own session.
    """
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

    def _create(
        user: UserORM, session_id: str, title: str, messages: list[dict[str, Any]]
    ) -> AgentSessionORM:
        db_obj = crud_agent_session.create(
            db=db_session,
            create_dto=AgentSessionCreate(
                session_id=session_id,
                title=title,
                user_id=user.id,
                messages=messages,
            ),
        )
        # commit each session on its own, so `now()` (the transaction start)
        # gives every session its own `updated` timestamp
        db_session.commit()
        db_session.refresh(db_obj)
        return db_obj

    return {
        "test_user": test_user,
        "session_older": _create(
            test_user,
            "session-older",
            "Older Session",
            _conversation("Hello", "Hi there"),
        ),
        "session_newer": _create(
            test_user,
            "session-newer",
            "Newer Session",
            _conversation("How many projects?", "You have no projects."),
        ),
        "session_invalid": _create(
            test_user, "session-invalid", "Broken Session", [{"kind": "garbage"}]
        ),
        "other_user": other_user,
        "other_session_same_id": _create(
            other_user,
            "session-older",
            "Other Older Session",
            _conversation("Hello", "Hi"),
        ),
        "other_session": _create(
            other_user, "session-other", "Other Session", _conversation("Hey", "Hey")
        ),
    }


@pytest.fixture(scope="function")
def other_client(
    app_client: TestClient, agent_sessions: AgentSessionState
) -> Generator[TestClient, Any, None]:
    """A client that sends its requests as the other user of `agent_sessions`."""
    c = dats_test_utils.create_user_client(app_client, agent_sessions["other_user"])
    yield c
    c.close()
