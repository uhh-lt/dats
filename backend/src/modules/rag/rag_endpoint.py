from typing import Annotated

from fastapi import APIRouter, Body, Depends

from common.dependencies import DBSession, get_current_user
from core.auth.authz_user import AuthzUser
from modules.rag.rag_dto import ChatSessionResponse
from modules.rag.rag_feature import RAG_CHAT
from modules.rag.rag_service import RAGService
from repos.llm_repo import LLMRepo
from systems.feature_system.feature_dependency import require_feature

router = APIRouter(
    prefix="/rag", dependencies=[Depends(get_current_user)], tags=["rag"]
)


@router.post(
    "/rag_session",
    dependencies=[Depends(require_feature(RAG_CHAT))],
    response_model=ChatSessionResponse,
    summary="Answer a query using Retrieval-Augmented Generation (RAG)",
)
def rag_session(
    project_id: int,
    query: Annotated[str, Body()],
    top_k: int,
    threshold: float,
    model: str,
    sdoc_ids: list[int] | None,
    db: DBSession,
    authz_user: AuthzUser = Depends(),
    session_id: str | None = None,
) -> ChatSessionResponse:
    authz_user.assert_in_project(project_id)

    return RAGService().retrieval_augmented_generation_with_session(
        project_id=project_id,
        query=query,
        top_k=top_k,
        threshold=threshold,
        model=model,
        sdoc_ids=sdoc_ids,
        db=db,
        session_id=session_id,
    )


@router.get(
    "/chat_session",
    response_model=ChatSessionResponse,
    summary="Initiate or continue a chat session with the LLM using a prompt",
)
def chat_session(
    *,
    model: str,
    prompt: str,
    session_id: str | None = None,
    authz_user: AuthzUser = Depends(),
) -> ChatSessionResponse:
    return RAGService().chat_with_session(
        model=model, prompt=prompt, session_id=session_id
    )


@router.get(
    "/models",
    response_model=list[str],
    summary="Get all available LLM models from the LLM Provider",
)
def get_available_models(
    authz_user: AuthzUser = Depends(),
) -> list[str]:
    return LLMRepo().get_available_llms()
