from collections import Counter
from typing import List, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db_session, skip_limit_params
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.search import SearchSDocsQueryParameters, SpanEntityStat, \
    PaginatedElasticSearchDocumentHits, SourceDocumentContentQuery, SourceDocumentFilenameQuery, MemoContentQuery, \
    PaginatedMemoSearchResults, MemoTitleQuery, KeywordStat, TagStat
from app.core.search.elasticsearch_service import ElasticSearchService
from app.core.search.search_service import SearchService

router = APIRouter(prefix="/search")
tags = ["search"]


@router.post("/sdoc", tags=tags,
             response_model=List[int],
             summary="Returns all SourceDocument IDs that match the query parameters.",
             description="Returns all SourceDocument Ids that match the query parameters.")
async def search_sdocs(*,
                       query_params: SearchSDocsQueryParameters) -> List[int]:
    # TODO Flo: only if the user has access?
    return SearchService().search_sdoc_ids_by_sdoc_query_parameters(query_params=query_params)


@router.post("/entity_stats", tags=tags,
             response_model=List[SpanEntityStat],
             summary="Returns SpanEntityStats for the given SourceDocuments.",
             description="Returns SpanEntityStats for the given SourceDocuments.")
async def search_span_entity_stats(*,
                                   db: Session = Depends(get_db_session),
                                   query_params: SearchSDocsQueryParameters) -> List[SpanEntityStat]:
    sdoc_ids = SearchService().search_sdoc_ids_by_sdoc_query_parameters(query_params=query_params)
    return crud_sdoc.collect_entity_stats(db=db, sdoc_ids=sdoc_ids, proj_id=query_params.proj_id)


@router.post("/keyword_stats", tags=tags,
             response_model=List[KeywordStat],
             summary="Returns SpanEntityStats for the given SourceDocuments.",
             description="Returns SpanEntityStats for the given SourceDocuments.")
async def search_keyword_stats(*,
                               query_params: SearchSDocsQueryParameters) -> List[KeywordStat]:
    sdoc_ids = SearchService().search_sdoc_ids_by_sdoc_query_parameters(query_params=query_params)
    keywords = ElasticSearchService().get_sdoc_keywords_by_sdoc_ids(sdoc_ids=set(sdoc_ids),
                                                                    proj_id=query_params.proj_id)
    keyword_counts = Counter([kw for x in keywords for kw in x.keywords])
    return [KeywordStat(keyword=keyword, count=count) for keyword, count in keyword_counts.items()]


@router.post("/tag_stats", tags=tags,
             response_model=List[TagStat],
             summary="Returns TagStat for the given SourceDocuments.",
             description="Returns Stat for the given SourceDocuments.")
async def search_tag_stats(*,
                           db: Session = Depends(get_db_session),
                           query_params: SearchSDocsQueryParameters) -> List[TagStat]:
    sdoc_ids = SearchService().search_sdoc_ids_by_sdoc_query_parameters(query_params=query_params)
    return crud_sdoc.collect_tag_stats(db=db, sdoc_ids=sdoc_ids)


@router.post("/lexical/sdoc/content", tags=tags,
             response_model=PaginatedElasticSearchDocumentHits,
             summary="Returns all SourceDocuments where the content matches the query via lexical search",
             description="Returns all SourceDocuments where the content matches the query via lexical search")
async def search_sdocs_by_content_query(*,
                                        content_query: SourceDocumentContentQuery,
                                        skip_limit: Dict[str, str] = Depends(skip_limit_params)) \
        -> PaginatedElasticSearchDocumentHits:
    return ElasticSearchService().search_sdocs_by_content_query(proj_id=content_query.proj_id,
                                                                query=content_query.content_query,
                                                                **skip_limit)


@router.post("/lexical/sdoc/filename", tags=tags,
             response_model=PaginatedElasticSearchDocumentHits,
             summary="Returns all SourceDocuments where the filename matches the query via lexical search",
             description="Returns all SourceDocuments where the filename matches the query via lexical search")
async def search_sdocs_by_filename_query(*,
                                         filename_query: SourceDocumentFilenameQuery,
                                         skip_limit: Dict[str, str] = Depends(skip_limit_params)) \
        -> PaginatedElasticSearchDocumentHits:
    if filename_query.prefix:
        return ElasticSearchService().search_sdocs_by_prefix_filename(proj_id=filename_query.proj_id,
                                                                      filename_prefix=filename_query.filename_query,
                                                                      **skip_limit)
    else:
        return ElasticSearchService().search_sdocs_by_exact_filename(proj_id=filename_query.proj_id,
                                                                     exact_filename=filename_query.filename_query,
                                                                     **skip_limit)


@router.post("/lexical/memo/content", tags=tags,
             response_model=PaginatedMemoSearchResults,
             summary="Returns all Memos where the content matches the query via lexical search",
             description="Returns all Memos where the content matches the query via lexical search")
async def search_memos_by_content_query(*,
                                        content_query: MemoContentQuery,
                                        skip_limit: Dict[str, str] = Depends(skip_limit_params)) \
        -> PaginatedMemoSearchResults:
    return ElasticSearchService().search_memos_by_content_query(proj_id=content_query.proj_id,
                                                                query=content_query.content_query,
                                                                user_id=content_query.user_id,
                                                                starred=content_query.starred,
                                                                **skip_limit)


@router.post("/lexical/memo/title", tags=tags,
             response_model=PaginatedMemoSearchResults,
             summary="Returns all Memos where the title matches the query via lexical search",
             description="Returns all Memos where the title matches the query via lexical search")
async def search_memos_by_title_query(*,
                                      title_query: MemoTitleQuery,
                                      skip_limit: Dict[str, str] = Depends(skip_limit_params)) \
        -> PaginatedMemoSearchResults:
    if title_query.prefix:
        return ElasticSearchService().search_memos_by_prefix_title(proj_id=title_query.proj_id,
                                                                   user_id=title_query.user_id,
                                                                   title_prefix=title_query.title_query,
                                                                   starred=title_query.starred,
                                                                   **skip_limit)
    else:
        return ElasticSearchService().search_memos_by_exact_title(proj_id=title_query.proj_id,
                                                                  user_id=title_query.user_id,
                                                                  exact_title=title_query.title_query,
                                                                  starred=title_query.starred,
                                                                  **skip_limit)
