from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from starlette.responses import Response

from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from modules.agent.agent_dto import (
    AgentQueryRequest,
    AgentQueryResponse,
    AgentSessionHistory,
)
from modules.agent.agent_enum import AgentName
from modules.agent.agent_service import AgentService
from modules.agent.agent_session_crud import crud_agent_session
from modules.agent.agent_session_dto import (
    AgentSessionRead,
    AgentSessionUpdate,
    AgentSessionUpdateIntern,
)
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/agent", dependencies=[Depends(get_current_user)], tags=["agent"]
)


# --- read operations


@router.get(
    "/sessions",
    response_model=list[AgentSessionRead],
    summary="Returns the current user's agent sessions, the most recently updated first.",
)
def get_sessions(
    *,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[AgentSessionRead]:
    return [
        AgentSessionRead.model_validate(db_obj)
        for db_obj in crud_agent_session.read_by_user(db=db, user_id=authz_user.user.id)
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
    "/models",
    response_model=list[str],
    summary="Returns the LLMs the agents can use.",
)
def get_models() -> list[str]:
    return AgentService().list_models()


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


@router.post(
    "/{agent_name}",
    response_model=AgentQueryResponse,
    summary="Answers a prompt with the agent, in a new or an existing session.",
)
async def ask_agent(
    *,
    db: Session = Depends(get_db_session),
    agent_name: AgentName,
    query: AgentQueryRequest,
    model: str | None = None,
    request: Request,
    authz_user: AuthzUser = Depends(),
) -> AgentQueryResponse:
    return await AgentService().run_agent(
        db=db,
        user_id=authz_user.user.id,
        agent_name=agent_name,
        query=query,
        model=model,
        auth_header=request.headers.get("authorization"),
    )


@router.post(
    "/agui/{agent_name}",
    summary="Runs the agent for an AG-UI request and streams its events.",
)
async def ask_agui_agent(
    *,
    db: Session = Depends(get_db_session),
    agent_name: AgentName,
    request: Request,
    authz_user: AuthzUser = Depends(),
) -> Response:
    return await AgentService().run_agui_agent(
        db=db,
        user_id=authz_user.user.id,
        agent_name=agent_name,
        request=request,
        auth_header=request.headers.get("authorization"),
    )
