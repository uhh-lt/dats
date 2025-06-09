from typing import List, Optional, Union

from app.core.authorization.authz_user import AuthzUser
from app.core.data.dto.chat import LLMSessionResponse
from app.core.data.llm.chat_service import (
    chat_session,
    retrieval_augmented_generation_with_session,
)
from app.core.search.filtering import Filter
from app.core.search.sdoc_search.sdoc_search_columns import SdocColumns
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session

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
    filter: Filter[SdocColumns],
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
        filter=filter,
        db=db,
        session_id=session_id,
    )


@router.get(
    "/chat_session",
    response_model=LLMSessionResponse,
    summary="TEST CHAT SESSION",
)
def chat_sesh(
    *,
    prompt: str,
    session_id: Optional[str] = None,
    authz_user: AuthzUser = Depends(),
) -> LLMSessionResponse:
    return chat_session(prompt=prompt, session_id=session_id)
