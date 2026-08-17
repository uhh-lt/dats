from sqlalchemy.orm import Session

from common.doc_type import DocType
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.code.code_dto import CodeRead
from core.code.code_orm import CodeORM
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_dto import AttachedObjectType
from core.memo.object_handle_crud import crud_object_handle
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataRead
from modules.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
from modules.search.search_dto import BBoxAnnotationRow, Page, QueryRequest
from repos.filesystem_repo import FilesystemRepo
from systems.search_system.column_info import ColumnInfo
from systems.search_system.grouping import GroupPage, GroupQueryRequest, GroupSummary
from systems.search_system.search_builder import SearchBuilder

repo_service = FilesystemRepo()


def find_bbox_annotations_info(
    db: Session, project_id: int
) -> list[ColumnInfo[BBoxColumns]]:
    project_metadata = [
        ProjectMetadataRead.model_validate(pm)
        for pm in crud_project_meta.read_by_project(db=db, proj_id=project_id)
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
    request: QueryRequest[BBoxColumns],
    user_id: int,
) -> Page[BBoxAnnotationRow]:
    builder = SearchBuilder(
        db,
        request.filter,
        request.sorts,
        group_by=request.group_by,
        group_key=request.group_key,
        user_id=user_id,
    )
    subquery = builder.init_subquery(
        db.query(
            BBoxAnnotationORM.id,
        ).group_by(
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
        .join(subquery, BBoxAnnotationORM.id == subquery.c.id)
        .filter(SourceDocumentORM.project_id == request.project_id)
    )._join_query(
        AnnotationDocumentORM,
        AnnotationDocumentORM.id == BBoxAnnotationORM.annotation_document_id,
    )._join_query(
        SourceDocumentORM,
        SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
    )._join_query(
        CodeORM,
        CodeORM.id == BBoxAnnotationORM.code_id,
    )
    builder.build_query()

    result_rows, total_results = builder.execute_query(
        page_number=request.page_number,
        page_size=request.page_size,
    )

    memo_ids_by_annotation = crud_object_handle.read_memo_ids_by_objects(
        db=db,
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
                url=repo_service.get_sdoc_url(
                    sdoc=SourceDocumentRead.model_validate(sdoc_orm),
                    relative=True,
                    webp=True,
                    thumbnail=False,
                ),
                code=CodeRead.model_validate(code_orm),
                sdoc=SourceDocumentRead.model_validate(sdoc_orm),
                tag_ids=[tag.id for tag in sdoc_orm.tags],
                memo_ids=memo_ids_by_annotation.get(row[0], []),
            )
        )
    return Page[BBoxAnnotationRow](items=items, total_results=total_results)


def find_bbox_annotation_groups(
    db: Session,
    *,
    request: GroupQueryRequest[BBoxColumns],
    user_id: int,
) -> GroupPage:
    """Group query: aggregate bbox annotations by a column -> GroupPage.

    The SearchBuilder grouping branch returns aggregate rows
    (group_key, group_label, total_results, target_id, target_type) directly.
    """
    builder = SearchBuilder(
        db, request.filter, sorts=[], group_by=request.group_by, user_id=user_id
    )
    subquery = builder.init_subquery(
        db.query(
            BBoxAnnotationORM.id,
        ).group_by(
            BBoxAnnotationORM.id,
        )
    ).build_subquery()
    builder.init_query(
        db.query(
            BBoxAnnotationORM.id,
        )
        .join(subquery, BBoxAnnotationORM.id == subquery.c.id)
        .filter(SourceDocumentORM.project_id == request.project_id)
    )._join_query(
        AnnotationDocumentORM,
        AnnotationDocumentORM.id == BBoxAnnotationORM.annotation_document_id,
    )._join_query(
        SourceDocumentORM,
        SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
    )._join_query(
        CodeORM,
        CodeORM.id == BBoxAnnotationORM.code_id,
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
