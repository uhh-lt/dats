from common.dependencies import DBSession
from common.project_router import project_router
from modules.statistics.statistics_dto import (
    CodeStatisticsRequest,
    SpanEntityStat,
    TagStat,
    TagStatisticsRequest,
)
from modules.statistics.statistics_service import StatisticsService

router = project_router("/statistics", tags=["statistics"])


@router.post(
    "/codes",
    response_model=list[SpanEntityStat],
    summary="Returns SpanEntityStats for the given SourceDocuments.",
)
def compute_code_statistics(
    *,
    db: DBSession,
    # code stat params
    project_id: int,
    request: CodeStatisticsRequest,
    # filter params
) -> list[SpanEntityStat]:
    if len(request.sdoc_ids) == 0:
        return []

    # compute code stats
    code_stats = StatisticsService().compute_code_statistics(
        db=db,
        project_id=project_id,
        code_id=request.code_id,
        sdoc_ids=set(request.sdoc_ids),
        top_k=request.top_k,
    )
    if request.sort_by_global:
        code_stats.sort(key=lambda x: x.global_count, reverse=True)
    return code_stats


@router.post(
    "/tags",
    response_model=list[TagStat],
    summary="Returns Stat for the given SourceDocuments.",
)
def compute_tag_statistics(
    *,
    db: DBSession,
    project_id: int,
    # keyword stat params
    request: TagStatisticsRequest,
    # filter params
) -> list[TagStat]:
    if len(request.sdoc_ids) == 0:
        return []

    # compute tag stats
    tag_stats = StatisticsService().compute_tag_statistics(
        db=db,
        project_id=project_id,
        sdoc_ids=set(request.sdoc_ids),
        top_k=request.top_k,
    )
    if request.sort_by_global:
        tag_stats.sort(key=lambda x: x.global_count, reverse=True)
    return tag_stats
