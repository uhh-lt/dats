# from typing import Optional, List
#
# from fastapi import APIRouter, Depends
# from fastapi import Query
#
# from api.auth.jwt_oauth2 import current_user
# from app.core.crud.document_service import DocumentService
# from app.search.elasticsearch import ElasticSearchService
# from config import conf
# from model import DocumentRead, ProjectCreate
# from model import UserRead
#
# router = APIRouter(prefix="/search")
# tags = ["search"]
#
# limit_query_parameter = Query(title="Document Limit",
#                               description="The maximum number of returned Documents",
#                               gt=0,
#                               lt=10000,
#                               default=100)
#
# es: ElasticSearchService = ElasticSearchService()
# doc_service: DocumentService = DocumentService()
#
# # FIXME
# demo_proj = ProjectCreate(name=conf.demo.project_name)


# @router.get("/docs/filename/exact/", tags=tags,
#             response_model=List[DocumentRead],
#             description="Returns the Document with the given ID if it exists")
# async def search_docs_by_exact_filename(filename: str,
#                                         limit: Optional[int] = limit_query_parameter) \
#         -> List[DocumentRead]:
#     es_docs = es.search_docs_by_exact_filename(index=demo_proj.doc_index,
#                                                filename=filename,
#                                                limit=limit)
#     return doc_service.to_document_reads(es_docs)
#
#
# @router.get("/docs/filename/prefix/", tags=tags,
#             response_model=List[DocumentRead],
#             description="Returns the Documents starting with the given prefix")
# async def search_docs_by_prefix_filename(filename_prefix: str,
#                                          limit: Optional[int] = limit_query_parameter) \
#         -> List[DocumentRead]:
#     es_docs = es.search_docs_by_prefix_filename(index=demo_proj.doc_index,
#                                                 filename_prefix=filename_prefix,
#                                                 limit=limit)
#     return doc_service.to_document_reads(es_docs)
#
#
# @router.get("/docs/content/", tags=tags,
#             response_model=List[DocumentRead],
#             description="Returns the best matching Documents according to the query")
# async def search_docs_via_query_in_content(query: str,
#                                            limit: Optional[int] = limit_query_parameter) \
#         -> List[DocumentRead]:
#     es_docs = es.search_docs_via_query_in_content(index=demo_proj.doc_index,
#                                                   query=query,
#                                                   limit=limit)
#     return doc_service.to_document_reads(es_docs)
#
#
# @router.get("/memo/content/", tags=tags,
#             response_model=List[DocumentRead],
#             description="Returns the best matching Memo according to the query")
# async def search_memo_via_query_in_content(query: str,
#                                            limit: Optional[int] = limit_query_parameter) \
#         -> List[DocumentRead]:
#     es_docs = es.search_docs_via_query_in_content(index=demo_proj.doc_index,
#                                                   query=query,
#                                                   limit=limit)
#     return doc_service.to_document_reads(es_docs)

# @router.post("/{project}/docs", tags=tags,
#              response_model=List[DocumentRead],
#              description="Returns the Document with the given ID if it exists")
# async def search_through_docs(filename: str, limit: Optional[int] = limit_query_parameter
#                               , user: UserRead = Depends(current_user)) -> List[DocumentRead]:
#     # TODO Flo: only if the user has access?
#     raise NotImplementedError()
#
#
# @router.post("/{project}/memos", tags=tags,
#              response_model=List[DocumentRead],
#              description="Returns the Document with the given ID if it exists")
# async def search_through_memos(filename: str, limit: Optional[int] = limit_query_parameter,
#                                user: UserRead = Depends(current_user)) -> List[DocumentRead]:
#     # TODO Flo: only if the user has access?
#     raise NotImplementedError()

from typing import List, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db_session, skip_limit_params
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.search import SearchSDocsQueryParameters
from app.core.data.dto.source_document import SourceDocumentRead

router = APIRouter(prefix="/search")
tags = ["search"]


@router.post("/sdoc", tags=tags,
             response_model=List[SourceDocumentRead],
             summary="Returns all SourceDocuments of the given Project that match the query parameters",
             description=("Returns all SourceDocuments of the given Project with the given ID that match the"
                          "query parameters"))
async def search_sdocs(*,
                       db: Session = Depends(get_db_session),
                       query_params: SearchSDocsQueryParameters,
                       skip_limit: Dict[str, str] = Depends(skip_limit_params)) -> List[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    # TODO Flo: combine both queries
    if query_params.span_entities:
        sdocs_spans = crud_sdoc.read_by_span_entities(db=db,
                                                      proj_id=query_params.proj_id,
                                                      user_ids=query_params.user_ids,
                                                      span_entities=query_params.span_entities,
                                                      **skip_limit)
    if query_params.tag_ids:
        sdocs_tags = crud_sdoc.read_by_project_and_document_tags(db=db,
                                                                 proj_id=query_params.proj_id,
                                                                 tag_ids=query_params.tag_ids,
                                                                 all_tags=query_params.all_tags,
                                                                 **skip_limit)

    if query_params.span_entities and query_params.tag_ids:
        sdocs_combined = set(sdocs_spans).union(set(sdocs_tags))
        return [SourceDocumentRead.from_orm(sdoc) for sdoc in sdocs_combined]
    elif query_params.span_entities and not query_params.tag_ids:
        return [SourceDocumentRead.from_orm(sdoc) for sdoc in sdocs_spans]
    elif not query_params.span_entities and query_params.tag_ids:
        return [SourceDocumentRead.from_orm(sdoc) for sdoc in sdocs_tags]
    elif not query_params.span_entities and not query_params.tag_ids:
        sdocs = crud_sdoc.read_by_project(proj_id=query_params.proj_id)
        return [SourceDocumentRead.from_orm(sdoc) for sdoc in sdocs]
