from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from common.feature_enum import Feature
from core.auth.authz_user import AuthzUser
from modules.search.sdoc_search.sdoc_search_columns import SdocColumns
from modules.simsearch.simsearch_dto import SimSearchImageHit, SimSearchSentenceHit
from modules.simsearch.simsearch_service import SimSearchService
from systems.feature_system.feature_dependency import require_feature
from systems.search_system.filtering import Filter

router = APIRouter(
    prefix="/simsearch",
    dependencies=[Depends(get_current_user)],
    tags=["simsearch"],
)


@router.post(
    "/sentences",
    dependencies=[Depends(require_feature(Feature.SENTENCE_SIMILARITY_SEARCH))],
    response_model=list[SimSearchSentenceHit],
    summary="Returns similar sentences according to a textual or visual query.",
)
def find_similar_sentences(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    query: str | list[str] | int,
    top_k: int,
    threshold: float,
    filter: Filter[SdocColumns],
    authz_user: AuthzUser = Depends(),
) -> list[SimSearchSentenceHit]:
    authz_user.assert_in_project(project_id)

    return SimSearchService().find_similar_sentences_with_filter(
        db=db,
        project_id=project_id,
        query=query,
        top_k=top_k,
        threshold=threshold,
        filter=filter,
    )


@router.post(
    "/images",
    dependencies=[Depends(require_feature(Feature.IMAGE_SIMILARITY_SEARCH))],
    response_model=list[SimSearchImageHit],
    summary="Returns similar images according to a textual or visual query.",
)
def find_similar_images(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    query: str | list[str] | int,
    top_k: int,
    threshold: float,
    filter: Filter[SdocColumns],
    authz_user: AuthzUser = Depends(),
) -> list[SimSearchImageHit]:
    authz_user.assert_in_project(project_id)

    return SimSearchService().find_similar_images_with_filter(
        db=db,
        project_id=project_id,
        query=query,
        top_k=top_k,
        threshold=threshold,
        filter=filter,
    )
