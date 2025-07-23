from typing import List, Optional, Union

from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from fastapi import APIRouter, Depends
from modules.llm_assistant.llm_chat import (
    chat_session,
    retrieval_augmented_generation_with_session,
)
from modules.rag.chat_dto import LLMSessionResponse
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/chat", dependencies=[Depends(get_current_user)], tags=["chat"]
)


@router.post(
    "/rag",
    response_model=LLMSessionResponse,
    summary="Answer a query using Retrieval-Augmented Generation (RAG)",
)
def rag_with_session(
    proj_id: int,
    query: Union[str, List[str], int],
    top_k: int,
    threshold: float,
    sdoc_ids: Optional[List[int]],
    authz_user: AuthzUser = Depends(),
    session_id: Optional[str] = None,
    db: Session = Depends(get_db_session),
) -> LLMSessionResponse:
    authz_user.assert_in_project(proj_id)

    return retrieval_augmented_generation_with_session(
        proj_id=proj_id,
        query=query,
        top_k=top_k,
        threshold=threshold,
        sdoc_ids=sdoc_ids,
        db=db,
        session_id=session_id,
    )


@router.get(
    "/chat_session",
    response_model=LLMSessionResponse,
    summary="Initiate or continue a chat session with the LLM using a prompt",
)
def chat_sesh(
    *,
    prompt: str,
    session_id: Optional[str] = None,
    authz_user: AuthzUser = Depends(),
) -> LLMSessionResponse:
    return chat_session(prompt=prompt, session_id=session_id)
