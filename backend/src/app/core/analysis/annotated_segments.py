from typing import List

from app.core.data.doc_type import DocType
from app.core.data.dto.analysis import AnnotatedSegmentResult
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM, CurrentCodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.db.sql_service import SQLService
from app.core.filters.columns import (
    AbstractColumns,
    ColumnInfo,
    create_metadata_column_info,
)
from app.core.filters.filtering import Filter, apply_filtering
from app.core.filters.filtering_operators import FilterOperator, FilterValueType
from app.core.filters.pagination import apply_pagination
from app.core.filters.sorting import Sort, apply_sorting


class AnnotatedSegmentsColumns(AbstractColumns):
    SOURCE_DOCUMENT_FILENAME = "ASC_SOURCE_SOURCE_DOCUMENT_FILENAME"
    DOCUMENT_TAG_ID_LIST = "ASC_DOCUMENT_DOCUMENT_TAG_ID_LIST"
    CODE_ID = "ASC_CODE_ID"
    SPAN_TEXT = "ASC_SPAN_TEXT"
    MEMO_CONTENT = "ASC_MEMO_CONTENT"

    def get_filter_column(self, **kwargs):
        match self:
            case AnnotatedSegmentsColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case AnnotatedSegmentsColumns.DOCUMENT_TAG_ID_LIST:
                return (SourceDocumentORM.document_tags, DocumentTagORM.id)
            case AnnotatedSegmentsColumns.CODE_ID:
                return CodeORM.id
            case AnnotatedSegmentsColumns.SPAN_TEXT:
                return SpanTextORM.text
            case AnnotatedSegmentsColumns.MEMO_CONTENT:
                return MemoORM.content

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case AnnotatedSegmentsColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterOperator.STRING
            case AnnotatedSegmentsColumns.DOCUMENT_TAG_ID_LIST:
                return FilterOperator.ID_LIST
            case AnnotatedSegmentsColumns.CODE_ID:
                return FilterOperator.ID
            case AnnotatedSegmentsColumns.SPAN_TEXT:
                return FilterOperator.STRING
            case AnnotatedSegmentsColumns.MEMO_CONTENT:
                return FilterOperator.STRING

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case AnnotatedSegmentsColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case AnnotatedSegmentsColumns.DOCUMENT_TAG_ID_LIST:
                return FilterValueType.TAG_ID
            case AnnotatedSegmentsColumns.CODE_ID:
                return FilterValueType.CODE_ID
            case AnnotatedSegmentsColumns.SPAN_TEXT:
                return FilterValueType.INFER_FROM_OPERATOR
            case AnnotatedSegmentsColumns.MEMO_CONTENT:
                return FilterValueType.INFER_FROM_OPERATOR

    def get_sort_column(self, **kwargs):
        match self:
            case AnnotatedSegmentsColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case AnnotatedSegmentsColumns.DOCUMENT_TAG_ID_LIST:
                return DocumentTagORM.title
            case AnnotatedSegmentsColumns.CODE_ID:
                return CodeORM.name
            case AnnotatedSegmentsColumns.SPAN_TEXT:
                return SpanTextORM.text
            case AnnotatedSegmentsColumns.MEMO_CONTENT:
                return MemoORM.content

    def get_label(self) -> str:
        match self:
            case AnnotatedSegmentsColumns.SOURCE_DOCUMENT_FILENAME:
                return "Document name"
            case AnnotatedSegmentsColumns.DOCUMENT_TAG_ID_LIST:
                return "Tags"
            case AnnotatedSegmentsColumns.CODE_ID:
                return "Code"
            case AnnotatedSegmentsColumns.SPAN_TEXT:
                return "Annotated text"
            case AnnotatedSegmentsColumns.MEMO_CONTENT:
                return "Memo content"


def find_annotated_segments_info(
    project_id,
) -> List[ColumnInfo[AnnotatedSegmentsColumns]]:
    with SQLService().db_session() as db:
        metadata_column_info = create_metadata_column_info(
            db=db, project_id=project_id, allowed_doctypes=[DocType.text]
        )

    return [
        ColumnInfo[AnnotatedSegmentsColumns].from_column(column)
        for column in AnnotatedSegmentsColumns
    ] + metadata_column_info


def find_annotated_segments(
    project_id: int,
    user_ids: List[int],
    filter: Filter[AnnotatedSegmentsColumns],
    page: int,
    page_size: int,
    sorts: List[Sort[AnnotatedSegmentsColumns]],
) -> AnnotatedSegmentResult:
    with SQLService().db_session() as db:
        query = (
            db.query(SpanAnnotationORM.id)
            # join Span Annotation with Source Document
            .join(SpanAnnotationORM.annotation_document)
            .join(AnnotationDocumentORM.source_document)
            # join Span Annotation with Code
            .join(SpanAnnotationORM.current_code)
            .join(CurrentCodeORM.code)
            # join Span Annotation with Text
            .join(SpanAnnotationORM.span_text)
            # join Span Annotation with Memo
            .join(SpanAnnotationORM.object_handle, isouter=True)
            .join(
                ObjectHandleORM.attached_memos, isouter=True
            )  # issouter true: return the row, even if no memo exists
            .filter(
                AnnotationDocumentORM.user_id.in_(user_ids),
                SourceDocumentORM.project_id == project_id,
            )
        )

        query = apply_filtering(query=query, filter=filter, db=db)

        query = apply_sorting(query=query, sorts=sorts)

        query = query.order_by(
            SpanAnnotationORM.id
        )  # this is very important, otherwise pagination will not work!
        query, pagination = apply_pagination(
            query=query, page_number=page + 1, page_size=page_size
        )

        result = query.all()
        return AnnotatedSegmentResult(
            total_results=pagination.total_results,
            span_annotation_ids=[row[0] for row in result],
        )
