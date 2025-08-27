from sqlalchemy.orm import Session

from common.doc_type import DocType
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.code.code_dto import CodeRead
from core.code.code_orm import CodeORM
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataRead
from modules.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
from modules.search.search_dto import BBoxAnnotationRow, BBoxAnnotationSearchResult
from repos.filesystem_repo import FilesystemRepo
from systems.search_system.column_info import ColumnInfo
from systems.search_system.filtering import Filter
from systems.search_system.search_builder import SearchBuilder
from systems.search_system.sorting import Sort

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
    project_id: int,
    filter: Filter[BBoxColumns],
    sorts: list[Sort[BBoxColumns]],
    page: int | None = None,
    page_size: int | None = None,
) -> BBoxAnnotationSearchResult:
    builder = SearchBuilder(db, filter, sorts)
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
        .filter(SourceDocumentORM.project_id == project_id)
    )._join_query(
        AnnotationDocumentORM,
        AnnotationDocumentORM.id == BBoxAnnotationORM.annotation_document_id,
    )._join_query(
        SourceDocumentORM,
        SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
    )._join_query(
        CodeORM,
        CodeORM.id == BBoxAnnotationORM.code_id,
    ).build_query()
    result_rows, total_results = builder.execute_query(
        page_number=page,
        page_size=page_size,
    )

    data = []
    for row in result_rows:
        bbox_orm: BBoxAnnotationORM = row[2]
        code_orm: CodeORM = row[3]
        sdoc_orm: SourceDocumentORM = row[4]
        data.append(
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
                memo=None,
            )
        )
    return BBoxAnnotationSearchResult(total_results=total_results, data=data)
