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
