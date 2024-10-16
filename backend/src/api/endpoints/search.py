from typing import List, Optional

from fastapi import APIRouter, Depends

from api.dependencies import get_current_user
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.dto.search import (
    PaginatedElasticSearchDocumentHits,
    SearchColumns,
    SimSearchImageHit,
    SimSearchQuery,
    SimSearchSentenceHit,
)
from app.core.data.dto.search_stats import KeywordStat, SpanEntityStat, TagStat
from app.core.filters.columns import ColumnInfo
from app.core.filters.filtering import Filter
from app.core.filters.sorting import Sort
from app.core.search.elasticsearch_service import ElasticSearchService
from app.core.search.search_service import SearchService

router = APIRouter(
    prefix="/search", dependencies=[Depends(get_current_user)], tags=["search"]
)

ss = SearchService()
es = ElasticSearchService()


@router.post(
    "/sdoc_info",
    response_model=List[ColumnInfo[SearchColumns]],
    summary="Returns Search Info.",
)
def search_sdocs_info(
    *, project_id: int, authz_user: AuthzUser = Depends()
) -> List[ColumnInfo[SearchColumns]]:
    authz_user.assert_in_project(project_id)

    return SearchService().search_info(project_id=project_id)


@router.post(
    "/sdoc",
    response_model=PaginatedElasticSearchDocumentHits,
    summary="Returns all SourceDocument Ids and their scores and (optional) hightlights that match the query parameters.",
)
def search_sdocs(
    *,
    project_id: int,
    search_query: str,
    expert_mode: bool,
    filter: Filter[SearchColumns],
    sorts: List[Sort[SearchColumns]],
    highlight: bool,
    page_number: Optional[int] = None,
    page_size: Optional[int] = None,
    authz_user: AuthzUser = Depends(),
) -> PaginatedElasticSearchDocumentHits:
    authz_user.assert_in_project(project_id)
    return SearchService().search(
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
    "/code_stats_by_search",
    response_model=List[SpanEntityStat],
    summary="Returns SpanEntityStats for the given search parameters.",
)
def search_code_stats(
    *,
    authz_user: AuthzUser = Depends(),
    # code stat params
    code_id: int,
    sort_by_global: bool = False,
    # search params
    project_id: int,
    search_query: str,
    expert_mode: bool,
    filter: Filter[SearchColumns],
    sorts: List[Sort[SearchColumns]],
) -> List[SpanEntityStat]:
    # search for relevant sdoc_ids
    authz_user.assert_in_project(project_id)
    search_result = SearchService().search(
        project_id=project_id,
        search_query=search_query,
        expert_mode=expert_mode,
        filter=filter,
        sorts=sorts,
        highlight=False,
    )
    sdoc_ids = [hit.document_id for hit in search_result.hits]
    if len(sdoc_ids) == 0:
        return []

    # compute code stats
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)
    code_stats = SearchService().compute_code_statistics(
        code_id=code_id, sdoc_ids=set(sdoc_ids)
    )
    if sort_by_global:
        code_stats.sort(key=lambda x: x.global_count, reverse=True)
    return code_stats


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
    # filter params
    sdoc_ids: List[int],
) -> List[SpanEntityStat]:
    if len(sdoc_ids) == 0:
        return []

    # compute code stats
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)
    code_stats = SearchService().compute_code_statistics(
        code_id=code_id, sdoc_ids=set(sdoc_ids)
    )
    if sort_by_global:
        code_stats.sort(key=lambda x: x.global_count, reverse=True)
    return code_stats


@router.post(
    "/keyword_stats_by_search",
    response_model=List[KeywordStat],
    summary="Returns KeywordStats for the given seach parameters.",
)
def search_keyword_stats(
    *,
    authz_user: AuthzUser = Depends(),
    project_id: int,
    # keyword stat params
    sort_by_global: bool = False,
    top_k: int = 50,
    # search params
    search_query: str,
    expert_mode: bool,
    filter: Filter[SearchColumns],
    sorts: List[Sort[SearchColumns]],
) -> List[KeywordStat]:
    # search for relevant sdoc_ids
    authz_user.assert_in_project(project_id)
    search_result = SearchService().search(
        project_id=project_id,
        search_query=search_query,
        expert_mode=expert_mode,
        filter=filter,
        sorts=sorts,
        highlight=False,
    )
    sdoc_ids = [hit.document_id for hit in search_result.hits]
    if len(sdoc_ids) == 0:
        return []

    # compute keyword stats
    keyword_stats = SearchService().compute_keyword_statistics(
        proj_id=project_id, sdoc_ids=set(sdoc_ids), top_k=top_k
    )
    if sort_by_global:
        keyword_stats.sort(key=lambda x: x.global_count, reverse=True)
    return keyword_stats


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
    top_k: int = 50,
    # filter params
    sdoc_ids: List[int],
) -> List[KeywordStat]:
    if len(sdoc_ids) == 0:
        return []

    # compute keyword stats
    keyword_stats = SearchService().compute_keyword_statistics(
        proj_id=project_id, sdoc_ids=set(sdoc_ids), top_k=top_k
    )
    if sort_by_global:
        keyword_stats.sort(key=lambda x: x.global_count, reverse=True)
    return keyword_stats


@router.post(
    "/tag_stats_by_search",
    response_model=List[TagStat],
    summary="Returns Stat for the given search parameters.",
)
def search_tag_stats(
    *,
    authz_user: AuthzUser = Depends(),
    # keyword stat params
    sort_by_global: bool = False,
    # search params
    project_id: int,
    search_query: str,
    expert_mode: bool,
    filter: Filter[SearchColumns],
    sorts: List[Sort[SearchColumns]],
) -> List[TagStat]:
    # search for relevant sdoc_ids
    authz_user.assert_in_project(project_id)
    search_result = SearchService().search(
        project_id=project_id,
        search_query=search_query,
        expert_mode=expert_mode,
        filter=filter,
        sorts=sorts,
        highlight=False,
    )
    sdoc_ids = [hit.document_id for hit in search_result.hits]
    if len(sdoc_ids) == 0:
        return []

    # compute tag stats
    tag_stats = SearchService().compute_tag_statistics(sdoc_ids=set(sdoc_ids))
    if sort_by_global:
        tag_stats.sort(key=lambda x: x.global_count, reverse=True)
    return tag_stats


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
    # filter params
    sdoc_ids: List[int],
) -> List[TagStat]:
    if len(sdoc_ids) == 0:
        return []

    # compute tag stats
    tag_stats = SearchService().compute_tag_statistics(sdoc_ids=set(sdoc_ids))
    if sort_by_global:
        tag_stats.sort(key=lambda x: x.global_count, reverse=True)
    return tag_stats


@router.post(
    "/simsearch/sentences",
    response_model=List[SimSearchSentenceHit],
    summary="Returns similar sentences according to a textual or visual query.",
)
def find_similar_sentences(
    query: SimSearchQuery, authz_user: AuthzUser = Depends()
) -> List[SimSearchSentenceHit]:
    authz_user.assert_in_project(query.proj_id)

    return ss.find_similar_sentences(query=query)


@router.post(
    "/simsearch/images",
    response_model=List[SimSearchImageHit],
    summary="Returns similar images according to a textual or visual query.",
)
def find_similar_images(
    query: SimSearchQuery, authz_user: AuthzUser = Depends()
) -> List[SimSearchImageHit]:
    authz_user.assert_in_project(query.proj_id)

    return ss.find_similar_images(query=query)
