from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.orm.user import UserORM
from app.core.db.sql_utils import aggregate_ids
from app.core.search.column_info import AbstractColumns
from app.core.search.filtering_operators import FilterOperator, FilterValueType
from app.core.search.search_builder import SearchBuilder


class AnnotatedSegmentsColumns(str, AbstractColumns):
    SPAN_TEXT = "ASC_SPAN_TEXT"
    CODE_ID = "ASC_CODE_ID"
    USER_ID = "ASC_USER_ID"
    MEMO_CONTENT = "ASC_MEMO_CONTENT"
    SOURCE_DOCUMENT_FILENAME = "ASC_SOURCE_SOURCE_DOCUMENT_FILENAME"
    DOCUMENT_TAG_ID_LIST = "ASC_DOCUMENT_DOCUMENT_TAG_ID_LIST"

    def get_filter_column(self, subquery_dict):
        match self:
            case AnnotatedSegmentsColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case AnnotatedSegmentsColumns.DOCUMENT_TAG_ID_LIST:
                return subquery_dict[
                    AnnotatedSegmentsColumns.DOCUMENT_TAG_ID_LIST.value
                ]
            case AnnotatedSegmentsColumns.CODE_ID:
                return CodeORM.id
            case AnnotatedSegmentsColumns.SPAN_TEXT:
                return SpanTextORM.text
            case AnnotatedSegmentsColumns.MEMO_CONTENT:
                return MemoORM.content
            case AnnotatedSegmentsColumns.USER_ID:
                return AnnotationDocumentORM.user_id

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

    def get_sort_column(self):
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

    def add_subquery_filter_statements(self, query_builder: SearchBuilder):
        match self:
            case AnnotatedSegmentsColumns.DOCUMENT_TAG_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        DocumentTagORM.id,
                        label=AnnotatedSegmentsColumns.DOCUMENT_TAG_ID_LIST.value,
                    )
                )
                query_builder._join_subquery(SpanAnnotationORM.annotation_document)
                query_builder._join_subquery(AnnotationDocumentORM.source_document)
                query_builder._join_subquery(
                    SourceDocumentORM.document_tags, isouter=True
                )

    def add_query_filter_statements(self, query_builder: SearchBuilder):
        match self:
            case AnnotatedSegmentsColumns.MEMO_CONTENT:
                # TODO, i need join_query for this, subquery is for aggregates, query for normal columns
                assert query_builder.query is not None, "Query is not initialized"
                query_builder.query = query_builder.query.join(
                    SpanAnnotationORM.object_handle, isouter=True
                ).join(
                    ObjectHandleORM.attached_memos.and_(
                        MemoORM.user_id == AnnotationDocumentORM.user_id
                    ),
                    isouter=True,
                )
