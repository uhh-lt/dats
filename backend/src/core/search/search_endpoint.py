from fastapi import Depends

from common.dependencies import DBSession
from common.project_router import project_router
from core.auth.authz_user import AuthzUser
from core.memo.memo_dto import MemoRead
from core.search.bbox_anno_search.bbox_anno_search import (
    find_bbox_annotation_groups,
    find_bbox_annotations,
    find_bbox_annotations_info,
)
from core.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
from core.search.memo_search.memo_search import (
    find_memo_groups,
    find_memo_info,
    find_memos,
)
from core.search.memo_search.memo_search_columns import MemoColumns
from core.search.sdoc_search.sdoc_search import (
    find_sdocs,
    find_sdocs_info,
)
from core.search.sdoc_search.sdoc_search_columns import SdocColumns
from core.search.search_dto import (
    BBoxAnnotationRow,
    Page,
    PaginatedSDocHits,
    QueryRequest,
    SentenceAnnotationRow,
    SpanAnnotationRow,
)
from core.search.sent_anno_search.sent_anno_search import (
    find_sentence_annotation_groups,
    find_sentence_annotations,
    find_sentence_annotations_info,
)
from core.search.sent_anno_search.sent_anno_search_columns import SentAnnoColumns
from core.search.span_anno_search.span_anno_search import (
    find_span_annotation_groups,
    find_span_annotations,
    find_span_annotations_info,
)
from core.search.span_anno_search.span_anno_search_columns import SpanColumns
from systems.search_system.column_info import ColumnInfo
from systems.search_system.filtering import Filter
from systems.search_system.grouping import GroupPage, GroupQueryRequest
from systems.search_system.sorting import Sort

router = project_router("/search", tags=["search", "mcp"])


@router.get(
    "/source-documents/info",
    response_model=list[ColumnInfo[SdocColumns]],
    summary="Returns Search Info.",
)
def search_sdoc_info(
    *,
    db: DBSession,
    project_id: int,
) -> list[ColumnInfo[SdocColumns]]:
    return find_sdocs_info(db=db, project_id=project_id)


@router.post(
    "/source-documents",
    response_model=PaginatedSDocHits,
    summary="Returns all SourceDocument Ids and their scores and (optional) hightlights that match the query parameters.",
)
def search_sdocs(
    *,
    db: DBSession,
    project_id: int,
    search_query: str,
    expert_mode: bool,
    filter: Filter[SdocColumns],
    sorts: list[Sort[SdocColumns]],
    highlight: bool,
    folder_id: int | None = None,
    page_number: int | None = None,
    page_size: int | None = None,
    show_folders: bool = True,
    show_child_folders: bool = False,
) -> PaginatedSDocHits:
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
        show_folders=show_folders,
        show_child_folders=show_child_folders,
    )


@router.get(
    "/memos/info",
    response_model=list[ColumnInfo[MemoColumns]],
    summary="Returns Memo Table Info.",
)
def search_memo_info(*, project_id: int) -> list[ColumnInfo[MemoColumns]]:
    return find_memo_info(project_id=project_id)


@router.post(
    "/memos",
    response_model=Page[MemoRead],
    summary="Queries Memo summaries for a workspace view",
)
def search_memos(
    *,
    db: DBSession,
    project_id: int,
    request: QueryRequest[MemoColumns],
    authz_user: AuthzUser = Depends(),
) -> Page[MemoRead]:
    return find_memos(
        db=db, project_id=project_id, request=request, user_id=authz_user.user.id
    )


@router.post(
    "/memos/groups",
    response_model=GroupPage,
    summary="Queries paginated Memo groups for a workspace view",
)
def search_memo_groups(
    *,
    db: DBSession,
    project_id: int,
    request: GroupQueryRequest[MemoColumns],
    authz_user: AuthzUser = Depends(),
) -> GroupPage:
    return find_memo_groups(
        db=db, project_id=project_id, request=request, user_id=authz_user.user.id
    )


@router.get(
    "/span-annotations/info",
    response_model=list[ColumnInfo[SpanColumns]],
    summary="Returns SpanAnnotationSearch Info.",
)
def search_span_annotation_info(
    *,
    db: DBSession,
    project_id: int,
) -> list[ColumnInfo[SpanColumns]]:
    return find_span_annotations_info(
        db=db,
        project_id=project_id,
    )


@router.post(
    "/span-annotations",
    response_model=Page[SpanAnnotationRow],
    summary="Returns SpanAnnotationSearch.",
)
def search_span_annotations(
    *,
    db: DBSession,
    project_id: int,
    request: QueryRequest[SpanColumns],
    authz_user: AuthzUser = Depends(),
) -> Page[SpanAnnotationRow]:
    return find_span_annotations(
        db=db, project_id=project_id, request=request, user_id=authz_user.user.id
    )


@router.post(
    "/span-annotations/groups",
    response_model=GroupPage,
    summary="Returns paginated SpanAnnotation groups.",
)
def search_span_annotation_groups(
    *,
    db: DBSession,
    project_id: int,
    request: GroupQueryRequest[SpanColumns],
    authz_user: AuthzUser = Depends(),
) -> GroupPage:
    return find_span_annotation_groups(
        db=db, project_id=project_id, request=request, user_id=authz_user.user.id
    )


@router.get(
    "/sentence-annotations/info",
    response_model=list[ColumnInfo[SentAnnoColumns]],
    summary="Returns SentenceAnnotationSearch Info.",
)
def search_sentence_annotation_info(
    *,
    db: DBSession,
    project_id: int,
) -> list[ColumnInfo[SentAnnoColumns]]:
    return find_sentence_annotations_info(
        db=db,
        project_id=project_id,
    )


@router.post(
    "/sentence-annotations",
    response_model=Page[SentenceAnnotationRow],
    summary="Returns Sentence Annotations.",
)
def search_sentence_annotations(
    *,
    db: DBSession,
    project_id: int,
    request: QueryRequest[SentAnnoColumns],
    authz_user: AuthzUser = Depends(),
) -> Page[SentenceAnnotationRow]:
    return find_sentence_annotations(
        db=db, project_id=project_id, request=request, user_id=authz_user.user.id
    )


@router.post(
    "/sentence-annotations/groups",
    response_model=GroupPage,
    summary="Returns paginated Sentence Annotation groups.",
)
def search_sentence_annotation_groups(
    *,
    db: DBSession,
    project_id: int,
    request: GroupQueryRequest[SentAnnoColumns],
    authz_user: AuthzUser = Depends(),
) -> GroupPage:
    return find_sentence_annotation_groups(
        db=db, project_id=project_id, request=request, user_id=authz_user.user.id
    )


@router.get(
    "/bbox-annotations/info",
    response_model=list[ColumnInfo[BBoxColumns]],
    summary="Returns BBoxAnnotationSearch Info.",
)
def search_bbox_annotation_info(
    *,
    db: DBSession,
    project_id: int,
) -> list[ColumnInfo[BBoxColumns]]:
    return find_bbox_annotations_info(
        db=db,
        project_id=project_id,
    )


@router.post(
    "/bbox-annotations",
    response_model=Page[BBoxAnnotationRow],
    summary="Returns BBox Annotations.",
)
def search_bbox_annotations(
    *,
    db: DBSession,
    project_id: int,
    request: QueryRequest[BBoxColumns],
    authz_user: AuthzUser = Depends(),
) -> Page[BBoxAnnotationRow]:
    return find_bbox_annotations(
        db=db, project_id=project_id, request=request, user_id=authz_user.user.id
    )


@router.post(
    "/bbox-annotations/groups",
    response_model=GroupPage,
    summary="Returns paginated BBox Annotation groups.",
)
def search_bbox_annotation_groups(
    *,
    db: DBSession,
    project_id: int,
    request: GroupQueryRequest[BBoxColumns],
    authz_user: AuthzUser = Depends(),
) -> GroupPage:
    return find_bbox_annotation_groups(
        db=db, project_id=project_id, request=request, user_id=authz_user.user.id
    )
