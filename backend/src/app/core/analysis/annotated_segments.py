from typing import List, Optional

from sqlalchemy import Integer, func
from sqlalchemy.dialects.postgresql import ARRAY, array_agg
from sqlalchemy.orm import InstrumentedAttribute

from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.doc_type import DocType
from app.core.data.dto.analysis import (
    AnnotatedSegmentResult,
    AnnotationTableRow,
)
from app.core.data.dto.code import CodeRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.orm.user import UserORM
from app.core.db.sql_service import SQLService
from app.core.filters.columns import (
    AbstractColumns,
    ColumnInfo,
)
from app.core.filters.filtering import Filter, apply_filtering
from app.core.filters.filtering_operators import FilterOperator, FilterValueType
from app.core.filters.pagination import apply_pagination
from app.core.filters.sorting import Sort, apply_sorting


def aggregate_ids(column: InstrumentedAttribute, label: str):
    return func.array_remove(
        array_agg(func.distinct(column), type_=ARRAY(Integer)),
        None,
        type_=ARRAY(Integer),
    ).label(label)


class AnnotatedSegmentsColumns(str, AbstractColumns):
    SPAN_TEXT = "ASC_SPAN_TEXT"
    CODE_ID = "ASC_CODE_ID"
    USER_ID = "ASC_USER_ID"
    MEMO_CONTENT = "ASC_MEMO_CONTENT"
    SOURCE_DOCUMENT_FILENAME = "ASC_SOURCE_SOURCE_DOCUMENT_FILENAME"
    DOCUMENT_TAG_ID_LIST = "ASC_DOCUMENT_DOCUMENT_TAG_ID_LIST"

    def get_filter_column(self, **kwargs):
        match self:
            case AnnotatedSegmentsColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case AnnotatedSegmentsColumns.DOCUMENT_TAG_ID_LIST:
                return AnnotatedSegmentsColumns.DOCUMENT_TAG_ID_LIST
            case AnnotatedSegmentsColumns.CODE_ID:
                return CodeORM.id
            case AnnotatedSegmentsColumns.SPAN_TEXT:
                return SpanTextORM.text
            case AnnotatedSegmentsColumns.MEMO_CONTENT:
                return MemoORM.content
            case AnnotatedSegmentsColumns.USER_ID:
                return UserORM.id

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
            case AnnotatedSegmentsColumns.USER_ID:
                return FilterOperator.ID

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
            case AnnotatedSegmentsColumns.USER_ID:
                return FilterValueType.USER_ID

    def get_sort_column(self, **kwargs):
        match self:
            case AnnotatedSegmentsColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case AnnotatedSegmentsColumns.DOCUMENT_TAG_ID_LIST:
                return None
            case AnnotatedSegmentsColumns.CODE_ID:
                return CodeORM.name
            case AnnotatedSegmentsColumns.SPAN_TEXT:
                return SpanTextORM.text
            case AnnotatedSegmentsColumns.MEMO_CONTENT:
                return MemoORM.content
            case AnnotatedSegmentsColumns.USER_ID:
                return UserORM.last_name

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
            case AnnotatedSegmentsColumns.USER_ID:
                return "User"


def find_annotated_segments_info(
    project_id,
) -> List[ColumnInfo[AnnotatedSegmentsColumns]]:
    with SQLService().db_session() as db:
        metadata_column_info = crud_project_meta.create_metadata_column_info(
            db=db, project_id=project_id, allowed_doctypes=[DocType.text]
        )

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
        tag_ids_agg = aggregate_ids(
            DocumentTagORM.id, label=AnnotatedSegmentsColumns.DOCUMENT_TAG_ID_LIST
        )

        # subquery of all memo ids for SpanAnnotations by user_id
        memo_subquery = (
            db.query(
                SpanAnnotationORM.id.label("span_annotation_id"),
                MemoORM.id.label("memo_id"),
            )
            .join(SpanAnnotationORM.annotation_document)
            .join(SpanAnnotationORM.object_handle)
            .join(ObjectHandleORM.attached_memos)
            .filter(
                MemoORM.project_id == project_id,  # memo is in the correct project
                MemoORM.user_id == user_id,  # i own the memo
            )
            .subquery()
        )

        query = (
            db.query(
                SpanAnnotationORM,
                SourceDocumentORM.filename,
                tag_ids_agg,
                SpanTextORM.text,
                CodeORM.id,
                MemoORM.content,
            )
            # join Span Annotation with Source Document
            .join(
                AnnotationDocumentORM,
                AnnotationDocumentORM.id == SpanAnnotationORM.annotation_document_id,
            )
            .join(
                SourceDocumentORM,
                SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
            )
            # join with User
            .join(
                UserORM,
                UserORM.id == AnnotationDocumentORM.user_id,
            )
            # join Source Document with Document Tag
            .join(SourceDocumentORM.document_tags, isouter=True)
            # join Span Annotation with Code
            .join(SpanAnnotationORM.code)
            # join Span Annotation with Text
            .join(SpanAnnotationORM.span_text)
            # join Span Annotation with my Memo
            .join(
                memo_subquery,
                SpanAnnotationORM.id == memo_subquery.c.span_annotation_id,
                isouter=True,
            )
            .join(
                MemoORM,
                MemoORM.id == memo_subquery.c.memo_id,
                isouter=True,
            )
            .group_by(
                SpanAnnotationORM.id,
                SourceDocumentORM.filename,
                SpanTextORM.text,
                CodeORM.id,
                MemoORM.content,
            )
            .filter(
                SourceDocumentORM.project_id == project_id,
            )
        )

        query = apply_filtering(query=query, filter=filter, db=db)

        query = apply_sorting(query=query, sorts=sorts, db=db)

        if page is not None and page_size is not None:
            query = query.order_by(
                SpanAnnotationORM.id
            )  # this is very important, otherwise pagination will not work!
            query, pagination = apply_pagination(
                query=query, page_number=page + 1, page_size=page_size
            )
            total_results = pagination.total_results
            result = query.all()
        else:
            result = query.all()
            total_results = len(result)

        return AnnotatedSegmentResult(
            total_results=total_results,
            data=[
                AnnotationTableRow(
                    id=row[0].id,
                    span_text=row[0].span_text.text,
                    code=CodeRead.model_validate(row[0].code),
                    user_id=row[0].annotation_document.user_id,
                    sdoc=SourceDocumentRead.model_validate(
                        row[0].annotation_document.source_document
                    ),
                    tags=[
                        DocumentTagRead.model_validate(tag)
                        for tag in row[
                            0
                        ].annotation_document.source_document.document_tags
                    ],
                    memo=None,
                )
                for row in result
            ],
        )
