from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from modules.rag.rag_dto import ChatSessionResponse
from modules.rag.rag_service import RAGService
from repos.llm_repo import LLMRepo

router = APIRouter(
    prefix="/rag", dependencies=[Depends(get_current_user)], tags=["rag"]
)


@router.post(
    "/rag_session",
    response_model=ChatSessionResponse,
    summary="Answer a query using Retrieval-Augmented Generation (RAG)",
)
def rag_session(
    proj_id: int,
    query: str | list[str] | int,
    top_k: int,
    threshold: float,
    sdoc_ids: list[int] | None,
    authz_user: AuthzUser = Depends(),
    session_id: str | None = None,
    db: Session = Depends(get_db_session),
) -> ChatSessionResponse:
    authz_user.assert_in_project(proj_id)

    response, session_id = RAGService().retrieval_augmented_generation_with_session(
        proj_id=proj_id,
        query=query,
        top_k=top_k,
        threshold=threshold,
        sdoc_ids=sdoc_ids,
        db=db,
        session_id=session_id,
    )
    return ChatSessionResponse(
        session_id=session_id,
        response=response.strip(),
    )


@router.get(
    "/chat_session",
    response_model=ChatSessionResponse,
    summary="Initiate or continue a chat session with the LLM using a prompt",
)
def chat_session(
    *,
    prompt: str,
    session_id: str | None = None,
    authz_user: AuthzUser = Depends(),
) -> ChatSessionResponse:
    response, session_id = LLMRepo().llm_chat_with_session(
        system_prompt="You are having a chat session with a user. Respond to their queries.",
        user_prompt=prompt,
        session_id=session_id,
    )
    return ChatSessionResponse(
        session_id=session_id,
        response=response.strip(),
    )
