from typing import List, Dict, Union

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db_session, skip_limit_params
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.search import SearchSDocsQueryParameters, SpanEntityFrequency, \
    PaginatedElasticSearchDocumentHits, SourceDocumentContentQuery, SourceDocumentFilenameQuery, MemoContentQuery, \
    PaginatedMemoSearchResults, MemoTitleQuery, KeywordStat, TagStat, SpanEntityDocumentFrequencyResult, \
    SimSearchSentenceHit, SimSearchImageHit
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
             response_model=List[SpanEntityFrequency],
             summary="Returns SpanEntityStats for the given SourceDocuments.",
             description="Returns SpanEntityStats for the given SourceDocuments.")
async def search_span_entity_stats(*,
                                   db: Session = Depends(get_db_session),
                                   query_params: SearchSDocsQueryParameters) -> List[SpanEntityFrequency]:
    sdoc_ids = SearchService().search_sdoc_ids_by_sdoc_query_parameters(query_params=query_params)
    return crud_sdoc.collect_entity_stats(db=db, sdoc_ids=sdoc_ids, proj_id=query_params.proj_id)


@router.post("/entity_document_stats", tags=tags,
             response_model=SpanEntityDocumentFrequencyResult,
             summary="Returns SpanEntityStats for the given SourceDocuments.",
             description="Returns SpanEntityStats for the given SourceDocuments.")
async def search_entity_document_stats(*,
                                       db: Session = Depends(get_db_session),
                                       query_params: SearchSDocsQueryParameters) -> SpanEntityDocumentFrequencyResult:
    sdoc_ids = SearchService().search_sdoc_ids_by_sdoc_query_parameters(query_params=query_params)
    # TODO Flo for large corpora this gets very slow. Hence we have to set a limit and in future implement some lazy
    #  loading or scrolling in the frontend with skip and limit.
    return crud_sdoc.collect_entity_document_stats(db=db,
                                                   sdoc_ids=sdoc_ids,
                                                   proj_id=query_params.proj_id,
                                                   skip=0, limit=10000)


@router.post("/keyword_stats", tags=tags,
             response_model=List[KeywordStat],
             summary="Returns KeywordStats for the given SourceDocuments.",
             description="Returns KeywordStats for the given SourceDocuments.")
async def search_keyword_stats(*,
                               query_params: SearchSDocsQueryParameters,
                               top_k: int = 50) -> List[KeywordStat]:
    sdoc_ids = SearchService().search_sdoc_ids_by_sdoc_query_parameters(query_params=query_params)
    return ElasticSearchService().get_sdoc_keyword_counts_by_sdoc_ids(proj_id=query_params.proj_id,
                                                                      sdoc_ids=set(sdoc_ids), top_k=top_k)


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


@router.post("/simsearch/sentences", tags=tags,
             response_model=List[SimSearchSentenceHit],
             summary="Returns similar sentence SpanAnnotation according to a textual or visual query.",
             description="Returns similar sentence SpanAnnotation according to a textual or visual query.")
async def find_similar_sentences(proj_id: int, query: Union[str, int], top_k: int = 10) \
        -> List[SimSearchSentenceHit]:
    # FIXME: Image query type not a valid pydantic type --> use uploaded image file or sdoc_id!
    return SearchService().find_similar_sentences(proj_id=proj_id, query=query, top_k=top_k)


@router.post("/simsearch/images", tags=tags,
             response_model=List[SimSearchImageHit],
             summary="Returns similar Image SourceDocuments according to a textual or visual query.",
             description="Returns similar Image SourceDocuments according to a textual or visual query.")
async def find_similar_images(proj_id: int, query: Union[str, int], top_k: int = 10) \
        -> List[SimSearchImageHit]:
    return SearchService().find_similar_images(proj_id=proj_id, query=query, top_k=top_k)