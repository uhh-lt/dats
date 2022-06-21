from typing import List, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db_session, skip_limit_params
from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.search import SearchSDocsQueryParameters, SpanEntityStatsQueryParameters, SpanEntityStat, \
    PaginatedSourceDocumentSearchResults, SourceDocumentContentQuery, SourceDocumentFilenameQuery, MemoContentQuery, \
    PaginatedMemoSearchResults, MemoTitleQuery
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.search.elasticsearch_service import ElasticSearchService

router = APIRouter(prefix="/search")
tags = ["search"]


@router.post("/sdoc", tags=tags,
             response_model=List[int],
             summary="Returns all SourceDocuments of the given Project that match the query parameters",
             description=("Returns all SourceDocuments of the given Project with the given ID that match the "
                          "query parameters"))
async def search_sdocs(*,
                       db: Session = Depends(get_db_session),
                       query_params: SearchSDocsQueryParameters,
                       skip_limit: Dict[str, str] = Depends(skip_limit_params)) -> List[int]:
    # TODO Flo: only if the user has access?
    # TODO Flo: combine both queries

    sdocs = []

    if query_params.span_entities:
        sdocs_spans = crud_sdoc.read_by_span_entities(db=db,
                                                      proj_id=query_params.proj_id,
                                                      user_ids=query_params.user_ids,
                                                      span_entities=query_params.span_entities,
                                                      **skip_limit)
        sdocs_spans = [sdoc.id for sdoc in sdocs_spans]
        sdocs.append(sdocs_spans)

    if query_params.tag_ids:
        sdocs_tags = crud_sdoc.read_by_project_and_document_tags(db=db,
                                                                 proj_id=query_params.proj_id,
                                                                 tag_ids=query_params.tag_ids,
                                                                 all_tags=query_params.all_tags,
                                                                 **skip_limit)
        sdocs_tags = [sdoc.id for sdoc in sdocs_tags]
        sdocs.append(sdocs_tags)

    if query_params.search_terms:
        proj = crud_project.read(db=db, id=query_params.proj_id)
        sdocs_terms = [sdoc.id for sdoc in
                       ElasticSearchService().search_sdocs_by_content_query(proj=proj,
                                                                            query=" ".join(query_params.search_terms),
                                                                            **skip_limit).sdocs]
        sdocs.append(sdocs_terms)

    if len(sdocs) == 0:
        # no search results, so we return all documents!
        return [sdoc.id for sdoc in crud_project.read(db=db, id=query_params.proj_id).source_documents]
    else:
        # we have search results, now we combine!
        return list(set.intersection(*map(set, sdocs)))


@router.post("/stats", tags=tags,
             response_model=List[SpanEntityStat],
             summary="Returns SpanEntityStats for the given SourceDocuments.",
             description="Returns SpanEntityStats for the given SourceDocuments.")
async def search_stats(*,
                       db: Session = Depends(get_db_session),
                       query_params: SpanEntityStatsQueryParameters,
                       skip_limit: Dict[str, str] = Depends(skip_limit_params)) -> List[SpanEntityStat]:
    return crud_sdoc.collect_entity_stats(db=db, sdoc_ids=query_params.sdoc_ids, proj_id=query_params.proj_id,
                                          **skip_limit)


@router.post("/lexical/sdoc/content", tags=tags,
             response_model=PaginatedSourceDocumentSearchResults,
             summary="Returns all SourceDocuments where the content matches the query via lexical search",
             description="Returns all SourceDocuments where the content matches the query via lexical search")
async def search_sdocs_by_content_query(*,
                                        db: Session = Depends(get_db_session),
                                        content_query: SourceDocumentContentQuery,
                                        skip_limit: Dict[str, str] = Depends(skip_limit_params)) \
        -> PaginatedSourceDocumentSearchResults:
    proj = crud_project.read(db=db, id=content_query.proj_id)
    return ElasticSearchService().search_sdocs_by_content_query(proj=proj,
                                                                query=content_query.content_query,
                                                                **skip_limit)


@router.post("/lexical/sdoc/filename", tags=tags,
             response_model=PaginatedSourceDocumentSearchResults,
             summary="Returns all SourceDocuments where the filename matches the query via lexical search",
             description="Returns all SourceDocuments where the filename matches the query via lexical search")
async def search_sdocs_by_filename_query(*,
                                         db: Session = Depends(get_db_session),
                                         filename_query: SourceDocumentFilenameQuery,
                                         skip_limit: Dict[str, str] = Depends(skip_limit_params)) \
        -> PaginatedSourceDocumentSearchResults:
    proj = crud_project.read(db=db, id=filename_query.proj_id)
    if filename_query.prefix:
        return ElasticSearchService().search_sdocs_by_prefix_filename(proj=proj,
                                                                      filename_prefix=filename_query.filename_query)
    else:
        return ElasticSearchService().search_sdocs_by_exact_filename(proj=proj,
                                                                     exact_filename=filename_query.filename_query,
                                                                     **skip_limit)


@router.post("/lexical/memo/content", tags=tags,
             response_model=PaginatedMemoSearchResults,
             summary="Returns all Memos where the content matches the query via lexical search",
             description="Returns all Memos where the content matches the query via lexical search")
async def search_memos_by_content_query(*,
                                        db: Session = Depends(get_db_session),
                                        content_query: MemoContentQuery,
                                        skip_limit: Dict[str, str] = Depends(skip_limit_params)) \
        -> PaginatedMemoSearchResults:
    proj = crud_project.read(db=db, id=content_query.proj_id)
    return ElasticSearchService().search_memos_by_content_query(proj=proj,
                                                                query=content_query.content_query,
                                                                user_id=content_query.user_id,
                                                                starred=content_query.starred,
                                                                **skip_limit)


@router.post("/lexical/memo/title", tags=tags,
             response_model=PaginatedMemoSearchResults,
             summary="Returns all Memos where the title matches the query via lexical search",
             description="Returns all Memos where the title matches the query via lexical search")
async def search_memos_by_title_query(*,
                                      db: Session = Depends(get_db_session),
                                      title_query: MemoTitleQuery,
                                      skip_limit: Dict[str, str] = Depends(skip_limit_params)) \
        -> PaginatedMemoSearchResults:
    proj = crud_project.read(db=db, id=title_query.proj_id)
    if title_query.prefix:
        return ElasticSearchService().search_memos_by_prefix_title(proj=proj,
                                                                   user_id=title_query.user_id,
                                                                   title_prefix=title_query.title_query,
                                                                   starred=title_query.starred,
                                                                   **skip_limit)
    else:
        return ElasticSearchService().search_memos_by_exact_title(proj=proj,
                                                                  user_id=title_query.user_id,
                                                                  exact_title=title_query.title_query,
                                                                  starred=title_query.starred,
                                                                  **skip_limit)
