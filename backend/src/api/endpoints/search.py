from typing import Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session, skip_limit_params
from app.core.data.dto.search import (
    MemoContentQuery,
    MemoTitleQuery,
    PaginatedMemoSearchResults,
    SimSearchImageHit,
    SimSearchQuery,
    SimSearchSentenceHit,
)
from app.core.data.dto.search_stats import KeywordStat, SpanEntityStat, TagStat
from app.core.filters.columns import ColumnInfo
from app.core.filters.filtering import Filter
from app.core.filters.sorting import Sort
from app.core.search.elasticsearch_service import ElasticSearchService
from app.core.search.search_service import SearchColumns, SearchService

router = APIRouter(
    prefix="/search", dependencies=[Depends(get_current_user)], tags=["search"]
)

ss = SearchService()
es = ElasticSearchService()


@router.post(
    "/sdoc_info",
    response_model=List[ColumnInfo[SearchColumns]],
    summary="Returns Search Info.",
    description="Returns Search Info.",
)
async def search_sdocs_info(
    *,
    project_id: int,
) -> List[ColumnInfo[SearchColumns]]:
    return SearchService().search_info(project_id=project_id)


@router.post(
    "/sdoc",
    response_model=List[int],
    summary="Returns all SourceDocument IDs that match the query parameters.",
    description="Returns all SourceDocument Ids that match the query parameters.",
)
async def search_sdocs(
    *,
    search_query: str,
    project_id: int,
    expert_mode: bool,
    filter: Filter[SearchColumns],
    sorts: List[Sort[SearchColumns]],
) -> List[int]:
    # TODO Flo: only if the user has access?
    return SearchService().search(
        search_query=search_query,
        expert_mode=expert_mode,
        project_id=project_id,
        filter=filter,
        sorts=sorts,
    )


@router.post(
    "/code_stats",
    response_model=List[SpanEntityStat],
    summary="Returns SpanEntityStats for the given SourceDocuments.",
    description="Returns SpanEntityStats for the given SourceDocuments.",
)
async def search_code_stats(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    user_ids: List[int],
    sdoc_ids: List[int],
    sort_by_global: bool = False,
) -> List[SpanEntityStat]:
    # TODO Flo for large corpora this gets very slow. Hence we have to set a limit and in future implement some lazy
    #  loading or scrolling in the frontend with skip and limit.
    code_stats = SearchService().compute_code_statistics(
        code_id=code_id, user_ids=set(user_ids), sdoc_ids=set(sdoc_ids)
    )
    if sort_by_global:
        code_stats.sort(key=lambda x: x.global_count, reverse=True)
    return code_stats


@router.post(
    "/keyword_stats",
    response_model=List[KeywordStat],
    summary="Returns KeywordStats for the given SourceDocuments.",
    description="Returns KeywordStats for the given SourceDocuments.",
)
async def search_keyword_stats(
    *,
    project_id: int,
    sdoc_ids: List[int],
    sort_by_global: bool = False,
    top_k: int = 50,
) -> List[KeywordStat]:
    if len(sdoc_ids) == 0:
        return []
    keyword_stats = SearchService().compute_keyword_statistics(
        proj_id=project_id, sdoc_ids=set(sdoc_ids), top_k=top_k
    )
    if sort_by_global:
        keyword_stats.sort(key=lambda x: x.global_count, reverse=True)
    return keyword_stats


@router.post(
    "/tag_stats",
    response_model=List[TagStat],
    summary="Returns TagStat for the given SourceDocuments.",
    description="Returns Stat for the given SourceDocuments.",
)
async def search_tag_stats(
    *,
    db: Session = Depends(get_db_session),
    sdoc_ids: List[int],
    sort_by_global: bool = False,
) -> List[TagStat]:
    tag_stats = SearchService().compute_tag_statistics(sdoc_ids=set(sdoc_ids))
    if sort_by_global:
        tag_stats.sort(key=lambda x: x.global_count, reverse=True)
    return tag_stats


@router.post(
    "/lexical/memo/content",
    response_model=PaginatedMemoSearchResults,
    summary="Returns all Memos where the content matches the query via lexical search",
    description="Returns all Memos where the content matches the query via lexical search",
)
async def search_memos_by_content_query(
    *,
    content_query: MemoContentQuery,
    skip_limit: Dict[str, int] = Depends(skip_limit_params),
) -> PaginatedMemoSearchResults:
    return es.search_memos_by_content_query(
        proj_id=content_query.proj_id,
        query=content_query.content_query,
        user_id=content_query.user_id,
        starred=content_query.starred,
        **skip_limit,
    )


@router.post(
    "/lexical/memo/title",
    response_model=PaginatedMemoSearchResults,
    summary="Returns all Memos where the title matches the query via lexical search",
    description="Returns all Memos where the title matches the query via lexical search",
)
async def search_memos_by_title_query(
    *,
    title_query: MemoTitleQuery,
    skip_limit: Dict[str, int] = Depends(skip_limit_params),
) -> PaginatedMemoSearchResults:
    return es.search_memos_by_title_query(
        proj_id=title_query.proj_id,
        user_id=title_query.user_id,
        query=title_query.title_query,
        starred=title_query.starred,
        **skip_limit,
    )


@router.post(
    "/simsearch/sentences",
    response_model=List[SimSearchSentenceHit],
    summary="Returns similar sentences according to a textual or visual query.",
    description="Returns similar sentences according to a textual or visual query.",
)
async def find_similar_sentences(query: SimSearchQuery) -> List[SimSearchSentenceHit]:
    return ss.find_similar_sentences(query=query)


@router.post(
    "/simsearch/images",
    response_model=List[SimSearchImageHit],
    summary="Returns similar images according to a textual or visual query.",
    description="Returns similar images according to a textual or visual query.",
)
async def find_similar_images(query: SimSearchQuery) -> List[SimSearchImageHit]:
    return ss.find_similar_images(query=query)
