from sqlalchemy.orm import Session

from common.doc_type import DocType
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_text_orm import SpanTextORM
from core.code.code_dto import CodeRead
from core.code.code_orm import CodeORM
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataRead
from modules.search.search_dto import SpanAnnotationRow, SpanAnnotationSearchResult
from modules.search.span_anno_search.span_anno_search_columns import SpanColumns
from systems.search_system.column_info import ColumnInfo
from systems.search_system.filtering import Filter
from systems.search_system.search_builder import SearchBuilder
from systems.search_system.sorting import Sort


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


def find_span_annotations(
    db: Session,
    project_id: int,
    filter: Filter[SpanColumns],
    sorts: list[Sort[SpanColumns]],
    page: int | None = None,
    page_size: int | None = None,
) -> SpanAnnotationSearchResult:
    builder = SearchBuilder(db, filter, sorts)
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
        .filter(SourceDocumentORM.project_id == project_id)
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
    ).build_query()
    result_rows, total_results = builder.execute_query(
        page_number=page,
        page_size=page_size,
    )

    data = []
    for row in result_rows:
        sdoc_orm: SourceDocumentORM = row[4]
        data.append(
            SpanAnnotationRow(
                id=row[0],
                span_text=row[1],
                user_id=row[2],
                code=CodeRead.model_validate(row[3]),
                sdoc=SourceDocumentRead.model_validate(sdoc_orm),
                tag_ids=[tag.id for tag in sdoc_orm.tags],
                memo=None,
            )
        )
    return SpanAnnotationSearchResult(total_results=total_results, data=data)
