from common.dependencies import DBSession
from common.project_router import project_router
from modules.keyword_statistics.keyword_statistics_dto import KeywordStat
from modules.keyword_statistics.keyword_statistics_feature import KEYWORD_STATISTICS
from modules.keyword_statistics.keyword_statistics_service import (
    KeywordStatisticsService,
)

router = project_router(
    "/keyword-statistics", tags=["keywordStatistics"], feature=KEYWORD_STATISTICS
)


# --- other operations


@router.post(
    "",
    response_model=list[KeywordStat],
    summary="Returns KeywordStats for the given SourceDocuments.",
)
def compute_keyword_statistics(
    *,
    db: DBSession,
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
    keyword_stats = KeywordStatisticsService().compute_keyword_statistics(
        db=db, project_id=project_id, sdoc_ids=set(sdoc_ids), top_k=top_k
    )
    if sort_by_global:
        keyword_stats.sort(key=lambda x: x.global_count, reverse=True)
    return keyword_stats
