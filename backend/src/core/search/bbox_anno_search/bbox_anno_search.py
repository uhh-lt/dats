from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.artefacts.thumbnail.web_image_file_crud import (
    WEB_IMAGE_FILENAME,
    crud_web_image_file,
)
from core.code.code_dto import CodeRead
from core.code.code_orm import CodeORM
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_enum import AttachedObjectType
from core.memo.object_handle_crud import crud_object_handle
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataRead
from core.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
from core.search.search_dto import BBoxAnnotationRow, Page, QueryRequest
from systems.search_system.column_info import ColumnInfo
from systems.search_system.grouping import GroupPage, GroupQueryRequest, GroupSummary
from systems.search_system.search_builder import SearchBuilder


def find_bbox_annotations_info(
    db: Session, project_id: int
) -> list[ColumnInfo[BBoxColumns]]:
    project_metadata = [
        ProjectMetadataRead.model_validate(pm)
        for pm in crud_project_meta.read_by_project(db=db, project_id=project_id)
    ]
    metadata_column_info = [
        ColumnInfo.from_project_metadata(pm)
        for pm in project_metadata
        if pm.doctype
        in [
            DocType.image,
        ]
    ]

    return [
        ColumnInfo[BBoxColumns].from_column(column) for column in BBoxColumns
    ] + metadata_column_info


def find_bbox_annotations(
    db: Session,
    *,
    project_id: int,
    request: QueryRequest[BBoxColumns],
    user_id: int,
) -> Page[BBoxAnnotationRow]:
    builder = SearchBuilder(
        db,
        project_id=project_id,
        filter=request.filter,
        sorts=request.sorts,
        group_by=request.group_by,
        group_key=request.group_key,
        user_id=user_id,
    )
    subquery = builder.init_subquery(
        db.query(
            BBoxAnnotationORM.id,
        )
        .filter(BBoxAnnotationORM.project_id == project_id)
        .group_by(
            BBoxAnnotationORM.id,
        )
    ).build_subquery()
    builder.init_query(
        db.query(
            BBoxAnnotationORM.id,
            AnnotationDocumentORM.user_id,
        )
        .add_entity(BBoxAnnotationORM)
        .add_entity(CodeORM)
        .add_entity(SourceDocumentORM)
        .add_columns(
            BBoxAnnotationORM.created,
            BBoxAnnotationORM.source_user_id,
            BBoxAnnotationORM.source_code_id,
        )
        .join(subquery, BBoxAnnotationORM.id == subquery.c.id)
        .filter(SourceDocumentORM.project_id == project_id)
    )._join_query(
        BBoxAnnotationORM.annotation_document,
    )._join_query(
        AnnotationDocumentORM.source_document,
    )._join_query(
        BBoxAnnotationORM.code,
    )
    builder.build_query()

    result_rows, total_results = builder.execute_query(
        page_number=request.page_number,
        page_size=request.page_size,
    )

    memo_ids_by_annotation = crud_object_handle.read_memo_ids_by_objects(
        db=db,
        project_id=project_id,
        attached_object_type=AttachedObjectType.bbox_annotation,
        object_ids=[row[0] for row in result_rows],
    )

    items = []
    for row in result_rows:
        bbox_orm: BBoxAnnotationORM = row[2]
        code_orm: CodeORM = row[3]
        sdoc_orm: SourceDocumentORM = row[4]
        items.append(
            BBoxAnnotationRow(
                id=row[0],
                user_id=row[1],
                x=bbox_orm.x_min,
                y=bbox_orm.y_min,
                width=bbox_orm.x_max - bbox_orm.x_min,
                height=bbox_orm.y_max - bbox_orm.y_min,
                url=crud_web_image_file.url(
                    project_id=sdoc_orm.project_id,
                    id=sdoc_orm.id,
                    name=WEB_IMAGE_FILENAME,
                ),
                code=CodeRead.model_validate(code_orm),
                sdoc=SourceDocumentRead.model_validate(sdoc_orm),
                tag_ids=[tag.id for tag in sdoc_orm.tags],
                memo_ids=memo_ids_by_annotation.get(row[0], []),
                created=row[5],
                source_user_id=row[6],
                source_code_id=row[7],
            )
        )
    return Page[BBoxAnnotationRow](items=items, total_results=total_results)


def find_bbox_annotation_groups(
    db: Session,
    *,
    project_id: int,
    request: GroupQueryRequest[BBoxColumns],
    user_id: int,
) -> GroupPage:
    """Group query: aggregate bbox annotations by a column -> GroupPage.

    The SearchBuilder grouping branch returns aggregate rows
    (group_key, group_label, total_results, target_id, target_type) directly.
    """
    builder = SearchBuilder(
        db,
        project_id=project_id,
        filter=request.filter,
        sorts=[],
        group_by=request.group_by,
        user_id=user_id,
    )
    subquery = builder.init_subquery(
        db.query(
            BBoxAnnotationORM.id,
        )
        .filter(BBoxAnnotationORM.project_id == project_id)
        .group_by(
            BBoxAnnotationORM.id,
        )
    ).build_subquery()
    builder.init_query(
        db.query(
            BBoxAnnotationORM.id,
        )
        .join(subquery, BBoxAnnotationORM.id == subquery.c.id)
        .filter(SourceDocumentORM.project_id == project_id)
    )._join_query(
        BBoxAnnotationORM.annotation_document,
    )._join_query(
        AnnotationDocumentORM.source_document,
    )._join_query(
        BBoxAnnotationORM.code,
    )
    builder.build_query()

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
