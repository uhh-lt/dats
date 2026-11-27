from common.dependencies import DBSession
from common.project_router import project_router
from modules.simsearch.simsearch_dto import (
    SimSearchImageHit,
    SimSearchRequest,
    SimSearchSentenceHit,
)
from modules.simsearch.simsearch_feature import SEMANTIC_SEARCH
from modules.simsearch.simsearch_service import SimSearchService

router = project_router(
    "/similarity-search", tags=["similaritySearch"], feature=SEMANTIC_SEARCH
)


# --- other operations


@router.post(
    "/sentences",
    response_model=list[SimSearchSentenceHit],
    summary="Returns similar sentences according to a textual or visual query.",
)
def find_similar_sentences(
    *,
    db: DBSession,
    project_id: int,
    request: SimSearchRequest,
) -> list[SimSearchSentenceHit]:
    return SimSearchService().find_similar_sentences(
        db=db,
        project_id=project_id,
        query=request.query,
        top_k=request.top_k,
        threshold=request.threshold,
        filter=request.filter,
    )


@router.post(
    "/images",
    response_model=list[SimSearchImageHit],
    summary="Returns similar images according to a textual or visual query.",
)
def find_similar_images(
    *,
    db: DBSession,
    project_id: int,
    request: SimSearchRequest,
) -> list[SimSearchImageHit]:
    return SimSearchService().find_similar_images(
        db=db,
        project_id=project_id,
        query=request.query,
        top_k=request.top_k,
        threshold=request.threshold,
        filter=request.filter,
    )
