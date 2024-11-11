from sqlalchemy import String, cast, func
from sqlalchemy.dialects.postgresql import ARRAY, array, array_agg

from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.orm.user import UserORM
from app.core.db.sql_utils import aggregate_ids
from app.core.search.column_info import AbstractColumns
from app.core.search.filtering_operators import FilterOperator, FilterValueType
from app.core.search.search_builder import SearchBuilder


class TimelineAnalysisColumns(str, AbstractColumns):
    SOURCE_DOCUMENT_FILENAME = "TA_SOURCE_DOCUMENT_FILENAME"
    DOCUMENT_TAG_ID_LIST = "TA_DOCUMENT_TAG_ID_LIST"
    CODE_ID_LIST = "TA_CODE_ID_LIST"
    USER_ID_LIST = "TA_USER_ID_LIST"
    SPAN_ANNOTATIONS = "TA_SPAN_ANNOTATIONS"

    def get_filter_column(self, subquery_dict: dict):
        match self:
            case TimelineAnalysisColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST:
                return subquery_dict[TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST.value]
            case TimelineAnalysisColumns.CODE_ID_LIST:
                return subquery_dict[TimelineAnalysisColumns.CODE_ID_LIST.value]
            case TimelineAnalysisColumns.USER_ID_LIST:
                return subquery_dict[TimelineAnalysisColumns.USER_ID_LIST.value]
            case TimelineAnalysisColumns.SPAN_ANNOTATIONS:
                return subquery_dict[TimelineAnalysisColumns.SPAN_ANNOTATIONS.value]

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case TimelineAnalysisColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterOperator.STRING
            case TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST:
                return FilterOperator.ID_LIST
            case TimelineAnalysisColumns.CODE_ID_LIST:
                return FilterOperator.ID_LIST
            case TimelineAnalysisColumns.USER_ID_LIST:
                return FilterOperator.ID_LIST
            case TimelineAnalysisColumns.SPAN_ANNOTATIONS:
                return FilterOperator.ID_LIST

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case TimelineAnalysisColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST:
                return FilterValueType.TAG_ID
            case TimelineAnalysisColumns.CODE_ID_LIST:
                return FilterValueType.CODE_ID
            case TimelineAnalysisColumns.USER_ID_LIST:
                return FilterValueType.USER_ID
            case TimelineAnalysisColumns.SPAN_ANNOTATIONS:
                return FilterValueType.SPAN_ANNOTATION

    def get_sort_column(self):
        match self:
            case TimelineAnalysisColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST:
                return DocumentTagORM.name
            case TimelineAnalysisColumns.CODE_ID_LIST:
                return None
            case TimelineAnalysisColumns.USER_ID_LIST:
                return None
            case TimelineAnalysisColumns.SPAN_ANNOTATIONS:
                return None

    def get_label(self) -> str:
        match self:
            case TimelineAnalysisColumns.SOURCE_DOCUMENT_FILENAME:
                return "Document name"
            case TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST:
                return "Tags"
            case TimelineAnalysisColumns.CODE_ID_LIST:
                return "Codes"
            case TimelineAnalysisColumns.USER_ID_LIST:
                return "Annotated by"
            case TimelineAnalysisColumns.SPAN_ANNOTATIONS:
                return "Span annotations"

    def add_subquery_filter_statements(self, query_builder: SearchBuilder):
        match self:
            case TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        DocumentTagORM.id,
                        label=TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST.value,
                    )
                )
                query_builder._join_subquery(
                    SourceDocumentORM.document_tags, isouter=True
                )
            case TimelineAnalysisColumns.CODE_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        CodeORM.id, label=TimelineAnalysisColumns.CODE_ID_LIST.value
                    )
                )
                query_builder._join_subquery(
                    SourceDocumentORM.annotation_documents,
                    isouter=True,
                )
                query_builder._join_subquery(
                    SpanAnnotationORM.code,
                    isouter=True,
                )
            case TimelineAnalysisColumns.USER_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        UserORM.id, TimelineAnalysisColumns.USER_ID_LIST.value
                    )
                )
                query_builder._join_subquery(
                    SourceDocumentORM.annotation_documents,
                    isouter=True,
                )
                query_builder._join_subquery(
                    AnnotationDocumentORM.user,
                    isouter=True,
                )
            case TimelineAnalysisColumns.SPAN_ANNOTATIONS:
                query_builder._add_subquery_column(
                    cast(
                        array_agg(
                            func.distinct(
                                array([cast(CodeORM.id, String), SpanTextORM.text])
                            ),
                        ),
                        ARRAY(String, dimensions=2),
                    ).label(TimelineAnalysisColumns.SPAN_ANNOTATIONS.value)
                )
                query_builder._join_subquery(
                    SourceDocumentORM.annotation_documents,
                    isouter=True,
                )
                query_builder._join_subquery(
                    AnnotationDocumentORM.span_annotations,
                    isouter=True,
                )
                query_builder._join_subquery(
                    SpanAnnotationORM.span_text,
                    isouter=True,
                )
                query_builder._join_subquery(
                    SpanAnnotationORM.code,
                    isouter=True,
                )

    def add_query_filter_statements(self, query_builder: SearchBuilder):
        pass
