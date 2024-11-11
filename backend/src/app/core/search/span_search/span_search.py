from typing import List, Optional

from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.doc_type import DocType
from app.core.data.dto.analysis import (
    AnnotatedSegmentResult,
    AnnotationTableRow,
)
from app.core.data.dto.code import CodeRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.db.sql_service import SQLService
from app.core.filters.column_info import (
    ColumnInfo,
)
from app.core.filters.filtering import Filter
from app.core.filters.search_builder import SearchBuilder
from app.core.filters.sorting import Sort
from app.core.search.span_search.span_search_columns import (
    AnnotatedSegmentsColumns,
)


def find_annotated_segments_info(
    project_id,
) -> List[ColumnInfo[AnnotatedSegmentsColumns]]:
    with SQLService().db_session() as db:
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
        ColumnInfo[AnnotatedSegmentsColumns].from_column(column)
        for column in AnnotatedSegmentsColumns
    ] + metadata_column_info


def find_annotated_segments(
    project_id: int,
    user_id: int,
    filter: Filter[AnnotatedSegmentsColumns],
    sorts: List[Sort[AnnotatedSegmentsColumns]],
    page: Optional[int] = None,
    page_size: Optional[int] = None,
) -> AnnotatedSegmentResult:
    with SQLService().db_session() as db:
        builder = SearchBuilder(db, filter, sorts)
        # build the initial subquery that queries all necessary data for the desired output
        subquery = builder.build_subquery(
            subquery=(
                db.query(
                    SpanAnnotationORM.id,
                ).group_by(
                    SpanAnnotationORM.id,
                )
            )
        )
        builder.build_query(
            query=(
                db.query(
                    SpanAnnotationORM.id,
                    SpanTextORM.text,
                    AnnotationDocumentORM.user_id,
                )
                .add_entity(CodeORM)
                .add_entity(SourceDocumentORM)
                .join(SpanAnnotationORM.annotation_document)
                .join(SpanAnnotationORM.span_text)
                .join(SpanAnnotationORM.code)
                .join(AnnotationDocumentORM.source_document)
                .join(subquery, SpanAnnotationORM.id == subquery.c.id)
                .filter(
                    SourceDocumentORM.project_id == project_id,
                    AnnotationDocumentORM.user_id == user_id,
                )
            ),
        )
        result_rows, total_results = builder.execute_query(
            page_number=page,
            page_size=page_size,
        )

        data = []
        for row in result_rows:
            sdoc_orm: SourceDocumentORM = row[4]
            data.append(
                AnnotationTableRow(
                    id=row[0],
                    span_text=row[1],
                    user_id=row[2],
                    code=CodeRead.model_validate(row[3]),
                    sdoc=SourceDocumentRead.model_validate(sdoc_orm),
                    tags=[
                        DocumentTagRead.model_validate(tag)
                        for tag in sdoc_orm.document_tags
                    ],
                    memo=None,
                )
            )
        return AnnotatedSegmentResult(total_results=total_results, data=data)
