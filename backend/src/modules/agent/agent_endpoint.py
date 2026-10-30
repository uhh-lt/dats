from collections.abc import AsyncIterator

from ag_ui.core import RunAgentInput
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from starlette.background import BackgroundTask
from starlette.responses import StreamingResponse

from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from modules.agent.agent_dto import (
    AgentQueryRequest,
    AgentQueryResponse,
    AgentSessionHistory,
    AgentToolRead,
)
from modules.agent.agent_enum import AgentName
from modules.agent.agent_service import AgentService
from modules.agent.agent_session_crud import crud_agent_session
from modules.agent.agent_session_dto import (
    AgentSessionRead,
    AgentSessionUpdate,
    AgentSessionUpdateIntern,
)
from modules.agent.auth_context_utils import forwarded_auth_headers
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/agent", dependencies=[Depends(get_current_user)], tags=["agent"]
)


# --- read operations


@router.get(
    "/project/{project_id}/sessions",
    response_model=list[AgentSessionRead],
    summary="Returns the current user's agent sessions of the project, the most recently updated first.",
)
def get_by_project(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[AgentSessionRead]:
    authz_user.assert_in_project(project_id)

    return [
        AgentSessionRead.model_validate(db_obj)
        for db_obj in crud_agent_session.read_by_project_and_user(
            db=db, project_id=project_id, user_id=authz_user.user.id
        )
    ]


@router.get(
    "/sessions/{session_id}/history",
    response_model=AgentSessionHistory,
    summary="Returns the messages of the current user's agent session as AG-UI messages.",
)
def get_session_history(
    *,
    db: Session = Depends(get_db_session),
    session_id: str,
    authz_user: AuthzUser = Depends(),
) -> AgentSessionHistory:
    return AgentService().read_session_history(
        db=db, user_id=authz_user.user.id, session_id=session_id
    )


@router.get(
    "/{agent_name}/tools",
    response_model=list[AgentToolRead],
    summary="Returns the tools (DATS endpoints) of the agent and whether they need the user's approval.",
)
async def get_tools(*, agent_name: AgentName) -> list[AgentToolRead]:
    return await AgentService().list_tools(agent_name=agent_name)


# --- update operations


@router.patch(
    "/sessions/{session_id}",
    response_model=AgentSessionRead,
    summary="Updates (renames) the current user's agent session.",
)
def update_session(
    *,
    db: Session = Depends(get_db_session),
    session_id: str,
    update_dto: AgentSessionUpdate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> AgentSessionRead:
    db_obj = crud_agent_session.read_by_user_and_session_id(
        db=db, user_id=authz_user.user.id, session_id=session_id
    )
    db_obj = crud_agent_session.update(
        db=db,
        id=db_obj.id,
        update_dto=AgentSessionUpdateIntern(
            **update_dto.model_dump(exclude_unset=True)
        ),
    )
    result = AgentSessionRead.model_validate(db_obj)
    ws.emit_to_user(DATSEvent.AGENT_SESSION_UPDATED, result, user_id=result.user_id)
    return result


# --- delete operations


@router.delete(
    "/sessions/{session_id}",
    response_model=AgentSessionRead,
    summary="Deletes the current user's agent session.",
)
def delete_session(
    *,
    db: Session = Depends(get_db_session),
    session_id: str,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> AgentSessionRead:
    db_obj = crud_agent_session.read_by_user_and_session_id(
        db=db, user_id=authz_user.user.id, session_id=session_id
    )
    result = AgentSessionRead.model_validate(db_obj)
    crud_agent_session.delete(db=db, id=db_obj.id)
    ws.emit_to_user(DATSEvent.AGENT_SESSION_DELETED, result, user_id=result.user_id)
    return result


# --- other operations
# The agent runs store their session themselves (see AgentService), so they
# give the request's connection back first: a run takes minutes, and each of
# its tool calls is a request that needs a connection of its own.


@router.post(
    "/project/{project_id}/{agent_name}",
    response_model=AgentQueryResponse,
    summary="Answers a prompt with the agent, in a new or an existing session of the project.",
)
async def ask_agent(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    agent_name: AgentName,
    query: AgentQueryRequest,
    model: str | None = None,
    request: Request,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> AgentQueryResponse:
    authz_user.assert_in_project(project_id)
    user_id = authz_user.user.id
    db.close()

    result = await AgentService().run_agent(
        user_id=user_id,
        project_id=project_id,
        agent_name=agent_name,
        query=query,
        model=model,
        auth_headers=forwarded_auth_headers(request.headers),
    )
    await ws.send_to_user_now(
        DATSEvent.AGENT_SESSION_UPDATED, result.session, user_id=user_id
    )
    return result


@router.post(
    "/project/{project_id}/{agent_name}/agui",
    summary="Runs the agent for an AG-UI request and streams its events.",
    # an AG-UI client (not the generated client) calls it with the AG-UI protocol
    include_in_schema=False,
)
async def ask_agui_agent(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    agent_name: AgentName,
    run_input: RunAgentInput,
    request: Request,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> StreamingResponse:
    authz_user.assert_in_project(project_id)
    user_id = authz_user.user.id
    db.close()

    agent_service = AgentService()
    run = await agent_service.start_agui_run(
        user_id=user_id,
        project_id=project_id,
        agent_name=agent_name,
        run_input=run_input,
        accept=request.headers.get("accept"),
        auth_headers=forwarded_auth_headers(request.headers),
    )
    # the session (with the prompt) is in the user's list while the agent runs
    await ws.send_to_user_now(
        DATSEvent.AGENT_SESSION_UPDATED, run.session, user_id=user_id
    )

    async def stream() -> AsyncIterator[str]:
        async for chunk in run.events:
            yield chunk
        session = agent_service.read_session(
            user_id=user_id, session_id=run.session.session_id
        )
        await ws.send_to_user_now(
            DATSEvent.AGENT_SESSION_UPDATED, session, user_id=user_id
        )

    # a new session gets its title after the answer, so the title does not
    # delay the answer
    async def title_session() -> None:
        session = await agent_service.title_session(
            user_id=user_id,
            session_id=run.session.session_id,
            model_name=run.model_name,
        )
        await ws.send_to_user_now(
            DATSEvent.AGENT_SESSION_UPDATED, session, user_id=user_id
        )

    return StreamingResponse(
        stream(),
        media_type=run.content_type,
        background=BackgroundTask(title_session) if run.needs_title else None,
    )
