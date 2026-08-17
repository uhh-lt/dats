from sqlalchemy.orm import Session

from common.doc_type import DocType
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_text_orm import SpanTextORM
from core.code.code_dto import CodeRead
from core.code.code_orm import CodeORM
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_dto import AttachedObjectType
from core.memo.object_handle_crud import crud_object_handle
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataRead
from modules.search.search_dto import Page, QueryRequest, SpanAnnotationRow
from modules.search.span_anno_search.span_anno_search_columns import SpanColumns
from systems.search_system.column_info import ColumnInfo
from systems.search_system.grouping import GroupPage, GroupQueryRequest, GroupSummary
from systems.search_system.search_builder import SearchBuilder


def find_span_annotations_info(
    db: Session,
    project_id: int,
) -> list[ColumnInfo[SpanColumns]]:
    project_metadata = [
        ProjectMetadataRead.model_validate(pm)
        for pm in crud_project_meta.read_by_project(db=db, proj_id=project_id)
    ]
    metadata_column_info = [
        ColumnInfo.from_project_metadata(pm)
        for pm in project_metadata
        if pm.doctype in [DocType.text]
    ]

    return [
        ColumnInfo[SpanColumns].from_column(column) for column in SpanColumns
    ] + metadata_column_info


def _apply_span_text_search(query, search_query: str):
    normalized_query = search_query.strip()
    if normalized_query == "":
        return query

    return query.filter(SpanTextORM.text.ilike(f"%{normalized_query}%"))


def find_span_annotations(
    db: Session,
    *,
    request: QueryRequest[SpanColumns],
    user_id: int,
) -> Page[SpanAnnotationRow]:
    builder = SearchBuilder(
        db,
        request.filter,
        request.sorts,
        group_by=request.group_by,
        group_key=request.group_key,
        user_id=user_id,
    )
    # build the initial subquery that queries all necessary data for the desired output
    subquery = builder.init_subquery(
        db.query(
            SpanAnnotationORM.id,
        ).group_by(
            SpanAnnotationORM.id,
        )
    ).build_subquery()
    builder.init_query(
        db.query(
            SpanAnnotationORM.id,
            SpanTextORM.text,
            AnnotationDocumentORM.user_id,
        )
        .add_entity(CodeORM)
        .add_entity(SourceDocumentORM)
        .join(subquery, SpanAnnotationORM.id == subquery.c.id)
        .filter(SourceDocumentORM.project_id == request.project_id)
        .filter(CodeORM.enabled == True)  # noqa: E712
    )._join_query(
        AnnotationDocumentORM,
        AnnotationDocumentORM.id == SpanAnnotationORM.annotation_document_id,
    )._join_query(
        SourceDocumentORM,
        SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
    )._join_query(
        CodeORM,
        CodeORM.id == SpanAnnotationORM.code_id,
    )._join_query(
        SpanTextORM,
        SpanTextORM.id == SpanAnnotationORM.span_text_id,
    )
    query = builder.build_query()

    # full-text search on the annotated span text
    query = _apply_span_text_search(query, request.search_query)

    builder.query = query
    result_rows, total_results = builder.execute_query(
        page_number=request.page_number,
        page_size=request.page_size,
    )

    memo_ids_by_annotation = crud_object_handle.read_memo_ids_by_objects(
        db=db,
        attached_object_type=AttachedObjectType.span_annotation,
        object_ids=[row[0] for row in result_rows],
    )

    items = []
    for row in result_rows:
        sdoc_orm: SourceDocumentORM = row[4]
        items.append(
            SpanAnnotationRow(
                id=row[0],
                span_text=row[1],
                user_id=row[2],
                code=CodeRead.model_validate(row[3]),
                sdoc=SourceDocumentRead.model_validate(sdoc_orm),
                tag_ids=[tag.id for tag in sdoc_orm.tags],
                memo_ids=memo_ids_by_annotation.get(row[0], []),
            )
        )
    return Page[SpanAnnotationRow](items=items, total_results=total_results)


def find_span_annotation_groups(
    db: Session,
    *,
    request: GroupQueryRequest[SpanColumns],
    user_id: int,
) -> GroupPage:
    """Group query: aggregate span annotations by a column -> paginated GroupPage.

    The SearchBuilder grouping branch returns aggregate rows
    (group_key, group_label, total_results, target_id, target_type) directly.
    """
    builder = SearchBuilder(
        db, request.filter, sorts=[], group_by=request.group_by, user_id=user_id
    )
    subquery = builder.init_subquery(
        db.query(
            SpanAnnotationORM.id,
        ).group_by(
            SpanAnnotationORM.id,
        )
    ).build_subquery()
    builder.init_query(
        db.query(
            SpanAnnotationORM.id,
        )
        .join(subquery, SpanAnnotationORM.id == subquery.c.id)
        .filter(SourceDocumentORM.project_id == request.project_id)
        .filter(CodeORM.enabled == True)  # noqa: E712
    )._join_query(
        AnnotationDocumentORM,
        AnnotationDocumentORM.id == SpanAnnotationORM.annotation_document_id,
    )._join_query(
        SourceDocumentORM,
        SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
    )._join_query(
        CodeORM,
        CodeORM.id == SpanAnnotationORM.code_id,
    )
    query = builder.build_query()

    # full-text search on the annotated span text (group query has no SpanTextORM
    # join yet, so add it here before filtering)
    if request.search_query.strip() != "":
        query = query.join(
            SpanTextORM, SpanTextORM.id == SpanAnnotationORM.span_text_id
        )
    query = _apply_span_text_search(query, request.search_query)

    builder.query = query
    rows, total_results = builder.execute_query(
        page_number=request.page_number,
        page_size=request.page_size,
    )

    groups = []
    for row in rows:
        data = row._mapping
        groups.append(
            GroupSummary(
                key=data["group_key"],
                label=data["group_label"],
                total_results=data["total_results"],
                target_id=data.get("target_id"),
                target_type=data.get("target_type"),
            )
        )

    return GroupPage(items=groups, total_results=total_results)
