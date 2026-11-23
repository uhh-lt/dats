from fastapi import APIRouter, Depends

from common.dependencies import DBSession, get_current_user
from core.auth.authz_user import AuthzUser
from modules.keyword_statistics.keyword_statistics_dto import KeywordStat
from modules.keyword_statistics.keyword_statistics_feature import KEYWORD_STATISTICS
from modules.keyword_statistics.keyword_statistics_service import (
    KeywordStatisticsService,
)
from systems.feature_system.feature_dependency import require_feature

router = APIRouter(
    prefix="/keyword_statistics",
    dependencies=[Depends(get_current_user)],
    tags=["keyword_statistics"],
)


# --- other operations


@router.post(
    "/keyword",
    dependencies=[Depends(require_feature(KEYWORD_STATISTICS))],
    response_model=list[KeywordStat],
    summary="Returns KeywordStats for the given SourceDocuments.",
)
def filter_keyword_stats(
    *,
    db: DBSession,
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
    authz_user.assert_in_project(project_id)
    keyword_stats = KeywordStatisticsService().compute_keyword_statistics(
        db=db, project_id=project_id, sdoc_ids=set(sdoc_ids), top_k=top_k
    )
    if sort_by_global:
        keyword_stats.sort(key=lambda x: x.global_count, reverse=True)
    return keyword_stats
