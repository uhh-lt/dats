from fastapi import APIRouter, Depends

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
    project_id: int,
    code_id: int,
    sort_by_global: bool = False,
    top_k: int = 20,
    # filter params
    sdoc_ids: list[int],
) -> list[SpanEntityStat]:
    if len(sdoc_ids) == 0:
        return []

    # compute code stats
    authz_user.assert_in_project(project_id)
    code_stats = StatisticsService().compute_code_statistics(
        db=db,
        project_id=project_id,
        code_id=code_id,
        sdoc_ids=set(sdoc_ids),
        top_k=top_k,
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
    project_id: int,
    # keyword stat params
    sort_by_global: bool = False,
    top_k: int = 20,
    # filter params
    sdoc_ids: list[int],
) -> list[TagStat]:
    authz_user.assert_in_project(project_id)
    if len(sdoc_ids) == 0:
        return []

    # compute tag stats
    tag_stats = StatisticsService().compute_tag_statistics(
        db=db, project_id=project_id, sdoc_ids=set(sdoc_ids), top_k=top_k
    )
    if sort_by_global:
        tag_stats.sort(key=lambda x: x.global_count, reverse=True)
    return tag_stats
