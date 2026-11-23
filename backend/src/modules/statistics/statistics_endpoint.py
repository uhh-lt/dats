from fastapi import APIRouter, Depends

from common.crud_enum import Crud
from common.dependencies import DBSession, get_current_user
from core.auth.authz_user import AuthzUser
from modules.statistics.statistics_dto import SpanEntityStat, TagStat
from modules.statistics.statistics_service import StatisticsService

router = APIRouter(
    prefix="/statistics",
    dependencies=[Depends(get_current_user)],
    tags=["statistics"],
)


@router.post(
    "/code",
    response_model=list[SpanEntityStat],
    summary="Returns SpanEntityStats for the given SourceDocuments.",
)
def filter_code_stats(
    *,
    db: DBSession,
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
    code_stats = StatisticsService().compute_code_statistics(
        db=db, code_id=code_id, sdoc_ids=set(sdoc_ids), top_k=top_k
    )
    if sort_by_global:
        code_stats.sort(key=lambda x: x.global_count, reverse=True)
    return code_stats


@router.post(
    "/tag",
    response_model=list[TagStat],
    summary="Returns Stat for the given SourceDocuments.",
)
def filter_tag_stats(
    *,
    db: DBSession,
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
    authz_user.assert_in_same_project_as_many(Crud.SOURCE_DOCUMENT, sdoc_ids)
    tag_stats = StatisticsService().compute_tag_statistics(
        db=db, sdoc_ids=set(sdoc_ids), top_k=top_k
    )
    if sort_by_global:
        tag_stats.sort(key=lambda x: x.global_count, reverse=True)
    return tag_stats
