from typing import List, Optional

from common.crud_enum import Crud
from common.dependencies import get_current_user
from core.auth.authz_user import AuthzUser
from fastapi import APIRouter, Depends
from modules.analysis.search_statistics.search_statistics import (
    compute_code_statistics,
    compute_keyword_statistics,
    compute_tag_statistics,
)
from modules.analysis.search_statistics.search_stats_dto import (
    KeywordStat,
    SpanEntityStat,
    TagStat,
)
from modules.search.memo_search.memo_search import memo_info, memo_search
from modules.search.memo_search.memo_search_columns import MemoColumns
from modules.search.sdoc_search.sdoc_search_columns import SdocColumns
from modules.search.sdoc_search.sdoc_search_service import SdocSearchService
from modules.search.search_dto import (
    PaginatedElasticSearchDocumentHits,
    PaginatedSDocHits,
)
from modules.search_system.column_info import ColumnInfo
from modules.search_system.filtering import Filter
from modules.search_system.sorting import Sort

router = APIRouter(
    prefix="/search", dependencies=[Depends(get_current_user)], tags=["search"]
)


@router.post(
    "/sdoc_info",
    response_model=List[ColumnInfo[SdocColumns]],
    summary="Returns Search Info.",
)
def search_sdocs_info(
    *, project_id: int, authz_user: AuthzUser = Depends()
) -> List[ColumnInfo[SdocColumns]]:
    authz_user.assert_in_project(project_id)

    return SdocSearchService().search_info(project_id=project_id)


@router.post(
    "/sdoc",
    response_model=PaginatedSDocHits,
    summary="Returns all SourceDocument Ids and their scores and (optional) hightlights that match the query parameters.",
)
def search_sdocs(
    *,
    project_id: int,
    search_query: str,
    expert_mode: bool,
    filter: Filter[SdocColumns],
    sorts: List[Sort[SdocColumns]],
    highlight: bool,
    page_number: Optional[int] = None,
    page_size: Optional[int] = None,
    authz_user: AuthzUser = Depends(),
) -> PaginatedSDocHits:
    authz_user.assert_in_project(project_id)
    return SdocSearchService().search(
        search_query=search_query,
        expert_mode=expert_mode,
        highlight=highlight,
        project_id=project_id,
        filter=filter,
        sorts=sorts,
        page_number=page_number,
        page_size=page_size,
    )


@router.post(
    "/info",
    response_model=List[ColumnInfo[MemoColumns]],
    summary="Returns Memo Table Info.",
)
def search_memo_info(
    *, project_id: int, authz_user: AuthzUser = Depends()
) -> List[ColumnInfo[MemoColumns]]:
    authz_user.assert_in_project(project_id)

    return memo_info(project_id=project_id)


@router.post(
    "/search",
    response_model=PaginatedElasticSearchDocumentHits,
    summary="Returns all Memo Ids that match the query parameters.",
)
def search_memos(
    *,
    search_query: str,
    project_id: int,
    search_content: bool,
    page_number: int,
    page_size: int,
    filter: Filter[MemoColumns],
    sorts: List[Sort[MemoColumns]],
    authz_user: AuthzUser = Depends(),
) -> PaginatedElasticSearchDocumentHits:
    authz_user.assert_in_project(project_id)

    return memo_search(
        project_id=project_id,
        search_query=search_query,
        search_content=search_content,
        filter=filter,
        sorts=sorts,
        page_number=page_number,
        page_size=page_size,
    )


@router.post(
    "/code_stats_by_sdocs",
    response_model=List[SpanEntityStat],
    summary="Returns SpanEntityStats for the given SourceDocuments.",
)
def filter_code_stats(
    *,
    authz_user: AuthzUser = Depends(),
    # code stat params
    code_id: int,
    sort_by_global: bool = False,
    top_k: int = 20,
    # filter params
    sdoc_ids: List[int],
) -> List[SpanEntityStat]:
    if len(sdoc_ids) == 0:
        return []

    # compute code stats
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)
    code_stats = compute_code_statistics(
        code_id=code_id, sdoc_ids=set(sdoc_ids), top_k=top_k
    )
    if sort_by_global:
        code_stats.sort(key=lambda x: x.global_count, reverse=True)
    return code_stats


@router.post(
    "/keyword_stats_by_sdocs",
    response_model=List[KeywordStat],
    summary="Returns KeywordStats for the given SourceDocuments.",
)
def filter_keyword_stats(
    *,
    authz_user: AuthzUser = Depends(),
    project_id: int,
    # keyword stat params
    sort_by_global: bool = False,
    top_k: int = 20,
    # filter params
    sdoc_ids: List[int],
) -> List[KeywordStat]:
    if len(sdoc_ids) == 0:
        return []

    # compute keyword stats
    keyword_stats = compute_keyword_statistics(
        proj_id=project_id, sdoc_ids=set(sdoc_ids), top_k=top_k
    )
    if sort_by_global:
        keyword_stats.sort(key=lambda x: x.global_count, reverse=True)
    return keyword_stats


@router.post(
    "/tag_stats_by_sdocs",
    response_model=List[TagStat],
    summary="Returns Stat for the given SourceDocuments.",
)
def filter_tag_stats(
    *,
    authz_user: AuthzUser = Depends(),
    # keyword stat params
    sort_by_global: bool = False,
    top_k: int = 20,
    # filter params
    sdoc_ids: List[int],
) -> List[TagStat]:
    if len(sdoc_ids) == 0:
        return []

    # compute tag stats
    tag_stats = compute_tag_statistics(sdoc_ids=set(sdoc_ids), top_k=top_k)
    if sort_by_global:
        tag_stats.sort(key=lambda x: x.global_count, reverse=True)
    return tag_stats
