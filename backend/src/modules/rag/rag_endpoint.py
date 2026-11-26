from typing import Annotated

from fastapi import Body, Depends

from common.dependencies import DBSession
from common.project_router import project_router
from core.auth.authz_user import AuthzUser
from modules.rag.rag_dto import ChatSessionResponse
from modules.rag.rag_feature import RAG_CHAT
from modules.rag.rag_service import RAGService

router = project_router("/rag", tags=["rag"], feature=RAG_CHAT)


# --- other operations


@router.post(
    "/session",
    response_model=ChatSessionResponse,
    summary="Answer a query using Retrieval-Augmented Generation (RAG)",
)
def rag_session(
    *,
    db: DBSession,
    project_id: int,
    query: Annotated[str, Body()],
    top_k: int,
    threshold: float,
    model: str,
    sdoc_ids: list[int] | None,
    session_id: str | None = None,
    authz_user: AuthzUser = Depends(),
) -> ChatSessionResponse:
    return RAGService().retrieval_augmented_generation_with_session(
        project_id=project_id,
        user_id=authz_user.user.id,
        query=query,
        top_k=top_k,
        threshold=threshold,
        model=model,
        sdoc_ids=sdoc_ids,
        db=db,
        session_id=session_id,
    )


@router.get(
    "/chat-session",
    response_model=ChatSessionResponse,
    summary="Initiate or continue a chat session with the LLM using a prompt",
)
def chat_session(
    *,
    project_id: int,
    model: str,
    prompt: str,
    session_id: str | None = None,
    authz_user: AuthzUser = Depends(),
) -> ChatSessionResponse:
    return RAGService().chat_with_session(
        project_id=project_id,
        user_id=authz_user.user.id,
        model=model,
        prompt=prompt,
        session_id=session_id,
    )
