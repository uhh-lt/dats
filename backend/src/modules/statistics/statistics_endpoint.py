from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from modules.statistics.statistics_dto import KeywordStat, SpanEntityStat, TagStat
from modules.statistics.statistics_service import (
    compute_code_statistics,
    compute_keyword_statistics,
    compute_tag_statistics,
)

router = APIRouter(
    prefix="/statistics", dependencies=[Depends(get_current_user)], tags=["statistics"]
)


@router.post(
    "/code",
    response_model=list[SpanEntityStat],
    summary="Returns SpanEntityStats for the given SourceDocuments.",
)
def filter_code_stats(
    *,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
    # code stat params
    code_id: int,
    sort_by_global: bool = False,
    top_k: int = 20,
    # filter params
    sdoc_ids: list[int],
) -> list[SpanEntityStat]:
    if len(sdoc_ids) == 0:
        return []

    # compute code stats
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)
    code_stats = compute_code_statistics(
        db=db, code_id=code_id, sdoc_ids=set(sdoc_ids), top_k=top_k
    )
    if sort_by_global:
        code_stats.sort(key=lambda x: x.global_count, reverse=True)
    return code_stats


@router.post(
    "/keyword",
    response_model=list[KeywordStat],
    summary="Returns KeywordStats for the given SourceDocuments.",
)
def filter_keyword_stats(
    *,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
    project_id: int,
    # keyword stat params
    sort_by_global: bool = False,
    top_k: int = 20,
    # filter params
    sdoc_ids: list[int],
) -> list[KeywordStat]:
    if len(sdoc_ids) == 0:
        return []

    # compute keyword stats
    keyword_stats = compute_keyword_statistics(
        db=db, proj_id=project_id, sdoc_ids=set(sdoc_ids), top_k=top_k
    )
    if sort_by_global:
        keyword_stats.sort(key=lambda x: x.global_count, reverse=True)
    return keyword_stats


@router.post(
    "/tag",
    response_model=list[TagStat],
    summary="Returns Stat for the given SourceDocuments.",
)
def filter_tag_stats(
    *,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
    # keyword stat params
    sort_by_global: bool = False,
    top_k: int = 20,
    # filter params
    sdoc_ids: list[int],
) -> list[TagStat]:
    if len(sdoc_ids) == 0:
        return []

    # compute tag stats
    tag_stats = compute_tag_statistics(db=db, sdoc_ids=set(sdoc_ids), top_k=top_k)
    if sort_by_global:
        tag_stats.sort(key=lambda x: x.global_count, reverse=True)
    return tag_stats
