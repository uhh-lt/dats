from fastapi import Depends

from common.dependencies import DBSession
from common.project_router import project_router
from core.auth.authz_user import AuthzUser
from modules.rag.rag_dto import ChatSessionResponse, RAGAnswerRequest
from modules.rag.rag_feature import RAG_CHAT
from modules.rag.rag_service import RAGService

router = project_router("/rag", tags=["rag"], feature=RAG_CHAT)


# --- other operations


@router.post(
    "/answers",
    response_model=ChatSessionResponse,
    summary="Answer a query using Retrieval-Augmented Generation (RAG)",
)
def compute_answers(
    *,
    db: DBSession,
    project_id: int,
    request: RAGAnswerRequest,
    authz_user: AuthzUser = Depends(),
) -> ChatSessionResponse:
    return RAGService().retrieval_augmented_generation_with_session(
        project_id=project_id,
        user_id=authz_user.user.id,
        query=request.query,
        top_k=request.top_k,
        threshold=request.threshold,
        model=request.model,
        sdoc_ids=request.sdoc_ids,
        db=db,
        session_id=request.session_id,
    )
