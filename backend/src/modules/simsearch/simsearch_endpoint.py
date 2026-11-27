from typing import Annotated

from fastapi import Body

from common.dependencies import DBSession
from common.project_router import project_router
from core.search.sdoc_search.sdoc_search_columns import SdocColumns
from modules.simsearch.simsearch_dto import SimSearchImageHit, SimSearchSentenceHit
from modules.simsearch.simsearch_feature import SEMANTIC_SEARCH
from modules.simsearch.simsearch_service import SimSearchService
from systems.search_system.filtering import Filter

router = project_router(
    "/similarity-search", tags=["simsearch"], feature=SEMANTIC_SEARCH
)


@router.post(
    "/sentences",
    response_model=list[SimSearchSentenceHit],
    summary="Returns similar sentences according to a textual or visual query.",
)
def find_similar_sentences(
    *,
    db: DBSession,
    project_id: int,
    query: Annotated[str | int, Body()],
    top_k: int,
    threshold: float,
    filter: Filter[SdocColumns],
) -> list[SimSearchSentenceHit]:
    return SimSearchService().find_similar_sentences(
        db=db,
        project_id=project_id,
        query=query,
        top_k=top_k,
        threshold=threshold,
        filter=filter,
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
    query: Annotated[str | int, Body()],
    top_k: int,
    threshold: float,
    filter: Filter[SdocColumns],
) -> list[SimSearchImageHit]:
    return SimSearchService().find_similar_images(
        db=db,
        project_id=project_id,
        query=query,
        top_k=top_k,
        threshold=threshold,
        filter=filter,
    )
