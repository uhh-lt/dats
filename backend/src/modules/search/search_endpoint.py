from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.doc.sdoc_kwic_dto import PaginatedElasticSearchKwicSnippets
from modules.search.bbox_anno_search.bbox_anno_search import (
    find_bbox_annotations,
    find_bbox_annotations_info,
)
from modules.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
from modules.search.memo_search.memo_search import find_memo_info, find_memos
from modules.search.memo_search.memo_search_columns import MemoColumns
from modules.search.sdoc_search.sdoc_search import (
    find_sdocs,
    find_sdocs_info,
    kwic_search,
)
from modules.search.sdoc_search.sdoc_search_columns import SdocColumns
from modules.search.search_dto import (
    BBoxAnnotationSearchResult,
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
from repos.elastic.elastic_dto_base import PaginatedElasticSearchHits
from systems.search_system.column_info import ColumnInfo
from systems.search_system.filtering import Filter
from systems.search_system.sorting import Sort

router = APIRouter(
    prefix="/search", dependencies=[Depends(get_current_user)], tags=["search"]
)


@router.post(
    "/sdoc_info",
    response_model=list[ColumnInfo[SdocColumns]],
    summary="Returns Search Info.",
)
def search_sdoc_info(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[ColumnInfo[SdocColumns]]:
    authz_user.assert_in_project(project_id)

    return find_sdocs_info(db=db, project_id=project_id)


@router.post(
    "/sdoc",
    response_model=PaginatedSDocHits,
    summary="Returns all SourceDocument Ids and their scores and (optional) hightlights that match the query parameters.",
)
def search_sdocs(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    search_query: str,
    expert_mode: bool,
    filter: Filter[SdocColumns],
    sorts: list[Sort[SdocColumns]],
    highlight: bool,
    folder_id: int | None = None,
    page_number: int | None = None,
    page_size: int | None = None,
    authz_user: AuthzUser = Depends(),
) -> PaginatedSDocHits:
    authz_user.assert_in_project(project_id)
    return find_sdocs(
        db=db,
        search_query=search_query,
        expert_mode=expert_mode,
        highlight=highlight,
        project_id=project_id,
        folder_id=folder_id,
        filter=filter,
        sorts=sorts,
        page_number=page_number,
        page_size=page_size,
    )


@router.post(
    "/sdoc/kwic",
    # response_model=PaginatedElasticSearchKwicHits,
    summary="Returns KWIC search results. Sorting direction is to the left or right.",
)
def search_sdocs_kwic(
    *,
    project_id: int,
    search_query: str,
    window: int = 5,
    direction: str = "left",  # "left" or "right"
    # fuzziness: int = 0,
    page_number: int = 1,
    page_size: int = 10,
    authz_user: AuthzUser = Depends(),
) -> PaginatedElasticSearchKwicSnippets:
    authz_user.assert_in_project(project_id)
    return kwic_search(
        project_id=project_id,
        search_query=search_query,
        window=window,
        page_number=page_number,
        page_size=page_size,
        direction=direction,
    )


@router.post(
    "/memo_info",
    response_model=list[ColumnInfo[MemoColumns]],
    summary="Returns Memo Table Info.",
)
def search_memo_info(
    *, project_id: int, authz_user: AuthzUser = Depends()
) -> list[ColumnInfo[MemoColumns]]:
    authz_user.assert_in_project(project_id)

    return find_memo_info(project_id=project_id)


@router.post(
    "/memo",
    response_model=PaginatedElasticSearchHits,
    summary="Returns all Memo Ids that match the query parameters.",
)
def search_memos(
    *,
    db: Session = Depends(get_db_session),
    search_query: str,
    project_id: int,
    search_content: bool,
    page_number: int,
    page_size: int,
    filter: Filter[MemoColumns],
    sorts: list[Sort[MemoColumns]],
    authz_user: AuthzUser = Depends(),
) -> PaginatedElasticSearchHits:
    authz_user.assert_in_project(project_id)

    return find_memos(
        db=db,
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
    response_model=list[ColumnInfo[SpanColumns]],
    summary="Returns SpanAnnotationSearch Info.",
)
def search_span_annotation_info(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[ColumnInfo[SpanColumns]]:
    authz_user.assert_in_project(project_id)
    return find_span_annotations_info(
        db=db,
        project_id=project_id,
    )


@router.post(
    "/span_annotation",
    response_model=SpanAnnotationSearchResult,
    summary="Returns SpanAnnotationSearch.",
)
def search_span_annotations(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    filter: Filter[SpanColumns],
    page: int | None = None,
    page_size: int | None = None,
    sorts: list[Sort[SpanColumns]],
    authz_user: AuthzUser = Depends(),
) -> SpanAnnotationSearchResult:
    authz_user.assert_in_project(project_id)

    return find_span_annotations(
        db=db,
        project_id=project_id,
        filter=filter,
        page=page,
        page_size=page_size,
        sorts=sorts,
    )


@router.post(
    "/sentence_annotation_info",
    response_model=list[ColumnInfo[SentAnnoColumns]],
    summary="Returns SentenceAnnotationSearch Info.",
)
def search_sentence_annotation_info(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[ColumnInfo[SentAnnoColumns]]:
    authz_user.assert_in_project(project_id)
    return find_sentence_annotations_info(
        db=db,
        project_id=project_id,
    )


@router.post(
    "/sentence_annotation",
    response_model=SentenceAnnotationSearchResult,
    summary="Returns Sentence Annotations.",
)
def search_sentence_annotations(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    filter: Filter[SentAnnoColumns],
    page: int | None = None,
    page_size: int | None = None,
    sorts: list[Sort[SentAnnoColumns]],
    authz_user: AuthzUser = Depends(),
) -> SentenceAnnotationSearchResult:
    authz_user.assert_in_project(project_id)

    return find_sentence_annotations(
        db=db,
        project_id=project_id,
        filter=filter,
        page=page,
        page_size=page_size,
        sorts=sorts,
    )


@router.post(
    "/bbox_annotation_info",
    response_model=list[ColumnInfo[BBoxColumns]],
    summary="Returns BBoxAnnotationSearch Info.",
)
def search_bbox_annotation_info(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[ColumnInfo[BBoxColumns]]:
    authz_user.assert_in_project(project_id)
    return find_bbox_annotations_info(
        db=db,
        project_id=project_id,
    )


@router.post(
    "/bbox_annotation",
    response_model=BBoxAnnotationSearchResult,
    summary="Returns BBoxAnnotationSearchResult.",
)
def search_bbox_annotations(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    filter: Filter[BBoxColumns],
    page: int | None = None,
    page_size: int | None = None,
    sorts: list[Sort[BBoxColumns]],
    authz_user: AuthzUser = Depends(),
) -> BBoxAnnotationSearchResult:
    authz_user.assert_in_project(project_id)

    return find_bbox_annotations(
        db=db,
        project_id=project_id,
        filter=filter,
        page=page,
        page_size=page_size,
        sorts=sorts,
    )
