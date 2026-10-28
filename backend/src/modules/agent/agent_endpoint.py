import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from loguru import logger
from openai import InternalServerError
from pydantic import BaseModel
from pydantic_ai.messages import ToolCallPart
from pydantic_ai.ui.ag_ui import AGUIAdapter
from sqlalchemy.orm import Session
from starlette.responses import Response

from common.dependencies import get_current_user, get_db_session
from core.user.user_orm import UserORM
from modules.agent.agent_service import (
    AgentName,
    _get_pydantic_model,
    generate_session_title,
    get_agent_and_toolset,
)
from modules.agent.agent_session_crud import crud_agent_session
from modules.agent.auth_context_utils import reset_auth_header, set_auth_header
from repos.llm_repo import LLMRepo

router = APIRouter(prefix="/agent", tags=["agent"])


class UpdateTitleRequest(BaseModel):
    title: str


class AgentQueryRequest(BaseModel):
    session_id: Optional[str] = None
    prompt: str


class AgentQueryResponse(BaseModel):
    session_id: str
    response: str
    tools_used: list[str]


@router.post("/{agent_name}", response_model=AgentQueryResponse)
async def ask_agent(
    agent_name: AgentName,
    payload: AgentQueryRequest,
    request: Request,
    model: Optional[str] = None,
    db: Session = Depends(get_db_session),
    current_user: UserORM = Depends(get_current_user),
):
    try:
        agent, toolset = get_agent_and_toolset(agent_name)
    except KeyError:
        raise HTTPException(
            status_code=404, detail=f"Agent '{agent_name}' not configured."
        )
    session_id = payload.session_id.strip() if payload.session_id else str(uuid.uuid4())
    history = crud_agent_session.get_session_history(db, session_id, current_user.id)
    is_new_session = len(history) == 0
    selected_model = _get_pydantic_model(model) if model else None
    authorization = request.headers.get("authorization")
    token = set_auth_header(authorization)
    try:
        async with toolset:
            result = await agent.run(
                payload.prompt,
                message_history=history,
                model=selected_model,
            )
    except InternalServerError:
        raise HTTPException(
            status_code=502,
            detail="The underlying LLM inference server encountered an internal error.",
        )
    finally:
        reset_auth_header(token)

    crud_agent_session.save_session_history(
        db, session_id, current_user.id, result.all_messages()
    )
    if is_new_session:
        title = await generate_session_title(payload.prompt)
        crud_agent_session.update_title_by_id(
            db, session_id=session_id, user_id=current_user.id, title=title
        )
    used_tools = []
    for message in result.new_messages():
        for part in message.parts:
            if isinstance(part, ToolCallPart):
                used_tools.append(part.tool_name)
    logger.info(
        f"Agent [{agent_name.value}] processed prompt for session [{session_id}]."
    )

    return AgentQueryResponse(
        session_id=session_id,
        response=str(result.output),
        tools_used=used_tools,
    )


@router.post("/agui/{agent_name}")
async def ask_agui_agent(
    agent_name: AgentName,
    request: Request,
    db: Session = Depends(get_db_session),
    current_user: UserORM = Depends(get_current_user),
) -> Response:
    try:
        agent, toolset = get_agent_and_toolset(agent_name)
    except KeyError:
        raise HTTPException(
            status_code=404, detail=f"Agent '{agent_name}' not configured."
        )
    except InternalServerError:
        raise HTTPException(
            status_code=502,
            detail="The underlying LLM inference server encountered an internal error.",
        )
    adapter = await AGUIAdapter.from_request(request, agent=agent)  # type: ignore
    session_id = adapter.run_input.thread_id or str(uuid.uuid4())
    history = crud_agent_session.get_session_history(
        db, session_id=session_id, user_id=current_user.id
    )
    is_new_session = len(history) == 0
    requested_model = getattr(adapter.run_input, "forwarded_props", {}).get("modelName")
    selected_model = _get_pydantic_model(requested_model) if requested_model else None
    authorization = request.headers.get("authorization")

    async def on_complete(result):
        crud_agent_session.save_session_history(
            db, session_id, current_user.id, result.all_messages()
        )
        if is_new_session:
            title = await generate_session_title(
                str(result.all_messages()[0].parts[1].content)
            )
            crud_agent_session.update_title_by_id(
                db, session_id=session_id, user_id=current_user.id, title=title
            )
        logger.info(f"Agent [{agent_name.value}] finished session [{session_id}].")

    token = set_auth_header(authorization)
    try:
        async with toolset:
            response = await AGUIAdapter.dispatch_request(
                request,
                agent=agent,
                message_history=history,
                on_complete=on_complete,
                model=selected_model,
            )

            # if response is streaming, defer cleanup until the stream finishes
            if isinstance(response, StreamingResponse):
                original_iterator = response.body_iterator

                async def streaming_with_auth_context():
                    stream_token = set_auth_header(authorization)
                    try:
                        async with toolset:
                            async for chunk in original_iterator:
                                yield chunk
                    finally:
                        reset_auth_header(stream_token)

                response.body_iterator = streaming_with_auth_context()

            return response
    finally:
        reset_auth_header(token)


@router.get("/agui/sessions/{session_id}/history")
def get_agui_session_history(
    session_id: str,
    db: Session = Depends(get_db_session),
    current_user: UserORM = Depends(get_current_user),
):
    history = crud_agent_session.get_session_history(
        db, session_id=session_id, user_id=current_user.id
    )

    agui_messages = AGUIAdapter.dump_messages(history) if history else []

    return {"messages": agui_messages}


@router.patch("/sessions/{session_id}/title")
def update_session_title(
    session_id: str,
    payload: UpdateTitleRequest,
    db: Session = Depends(get_db_session),
    current_user: UserORM = Depends(get_current_user),
):
    """Allow users to manually rename a session."""
    updated = crud_agent_session.update_title_by_id(
        db, session_id=session_id, user_id=current_user.id, title=payload.title
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"status": "success", "title": payload.title}


@router.get("/sessions")
def list_user_sessions(
    db: Session = Depends(get_db_session),
    current_user: UserORM = Depends(get_current_user),
):
    sessions = crud_agent_session.get_user_sessions(db, user_id=current_user.id)
    return [
        {
            "session_id": session.session_id,
            "title": session.title,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
        }
        for session in sessions
    ]


@router.get("/list_models")
def list_models(
    current_user: UserORM = Depends(get_current_user),
):
    llm = LLMRepo()
    return {"models": llm.get_available_llms()}


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    db: Session = Depends(get_db_session),
    current_user: UserORM = Depends(get_current_user),
):
    deleted = crud_agent_session.delete_by_session_id(
        db, session_id=session_id, user_id=current_user.id
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"status": "success", "session_id": session_id}
