from typing import List, Optional

from common.dependencies import get_current_user
from core.auth.authz_user import AuthzUser
from fastapi import APIRouter, Depends
from modules.search.bbox_anno_search.bbox_anno_search import (
    find_bbox_annotations,
    find_bbox_annotations_info,
)
from modules.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
from modules.search.memo_search.memo_search import memo_info, memo_search
from modules.search.memo_search.memo_search_columns import MemoColumns
from modules.search.sdoc_search.sdoc_search_columns import SdocColumns
from modules.search.sdoc_search.sdoc_search_service import SdocSearchService
from modules.search.search_dto import (
    BBoxAnnotationSearchResult,
    PaginatedElasticSearchDocumentHits,
    PaginatedSDocHits,
    SentenceAnnotationSearchResult,
    SpanAnnotationSearchResult,
)
from modules.search.sent_anno_search.sent_anno_search import (
    find_sentence_annotations,
    find_sentence_annotations_info,
)
from modules.search.sent_anno_search.sent_anno_search_columns import SentAnnoColumns
from modules.search.span_anno_search.span_anno_search import (
    find_span_annotations,
    find_span_annotations_info,
)
from modules.search.span_anno_search.span_anno_search_columns import SpanColumns
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
def search_sdoc_info(
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
    "/memo_info",
    response_model=List[ColumnInfo[MemoColumns]],
    summary="Returns Memo Table Info.",
)
def search_memo_info(
    *, project_id: int, authz_user: AuthzUser = Depends()
) -> List[ColumnInfo[MemoColumns]]:
    authz_user.assert_in_project(project_id)

    return memo_info(project_id=project_id)


@router.post(
    "/memo",
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
    "/span_annotation_info",
    response_model=List[ColumnInfo[SpanColumns]],
    summary="Returns SpanAnnotationSearch Info.",
)
def search_span_annotation_info(
    *,
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[ColumnInfo[SpanColumns]]:
    authz_user.assert_in_project(project_id)
    return find_span_annotations_info(
        project_id=project_id,
    )


@router.post(
    "/span_annotation",
    response_model=SpanAnnotationSearchResult,
    summary="Returns SpanAnnotationSearch.",
)
def search_span_annotations(
    *,
    project_id: int,
    filter: Filter[SpanColumns],
    page: Optional[int] = None,
    page_size: Optional[int] = None,
    sorts: List[Sort[SpanColumns]],
    authz_user: AuthzUser = Depends(),
) -> SpanAnnotationSearchResult:
    authz_user.assert_in_project(project_id)

    return find_span_annotations(
        project_id=project_id,
        filter=filter,
        page=page,
        page_size=page_size,
        sorts=sorts,
    )


@router.post(
    "/sentence_annotation_info",
    response_model=List[ColumnInfo[SentAnnoColumns]],
    summary="Returns SentenceAnnotationSearch Info.",
)
def search_sentence_annotation_info(
    *,
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[ColumnInfo[SentAnnoColumns]]:
    authz_user.assert_in_project(project_id)
    return find_sentence_annotations_info(
        project_id=project_id,
    )


@router.post(
    "/sentence_annotation",
    response_model=SentenceAnnotationSearchResult,
    summary="Returns Sentence Annotations.",
)
def search_sentence_annotations(
    *,
    project_id: int,
    filter: Filter[SentAnnoColumns],
    page: Optional[int] = None,
    page_size: Optional[int] = None,
    sorts: List[Sort[SentAnnoColumns]],
    authz_user: AuthzUser = Depends(),
) -> SentenceAnnotationSearchResult:
    authz_user.assert_in_project(project_id)

    return find_sentence_annotations(
        project_id=project_id,
        filter=filter,
        page=page,
        page_size=page_size,
        sorts=sorts,
    )


@router.post(
    "/bbox_annotation_info",
    response_model=List[ColumnInfo[BBoxColumns]],
    summary="Returns BBoxAnnotationSearch Info.",
)
def search_bbox_annotation_info(
    *,
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[ColumnInfo[BBoxColumns]]:
    authz_user.assert_in_project(project_id)
    return find_bbox_annotations_info(
        project_id=project_id,
    )


@router.post(
    "/bbox_annotation",
    response_model=BBoxAnnotationSearchResult,
    summary="Returns BBoxAnnotationSearchResult.",
)
def search_bbox_annotations(
    *,
    project_id: int,
    filter: Filter[BBoxColumns],
    page: Optional[int] = None,
    page_size: Optional[int] = None,
    sorts: List[Sort[BBoxColumns]],
    authz_user: AuthzUser = Depends(),
) -> BBoxAnnotationSearchResult:
    authz_user.assert_in_project(project_id)

    return find_bbox_annotations(
        project_id=project_id,
        filter=filter,
        page=page,
        page_size=page_size,
        sorts=sorts,
    )
