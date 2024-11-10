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
from app.core.filters.column_info import AbstractColumns
from app.core.filters.filtering_operators import FilterOperator, FilterValueType


class TimelineAnalysisColumns(str, AbstractColumns):
    SOURCE_DOCUMENT_FILENAME = "TA_SOURCE_DOCUMENT_FILENAME"
    DOCUMENT_TAG_ID_LIST = "TA_DOCUMENT_TAG_ID_LIST"
    CODE_ID_LIST = "TA_CODE_ID_LIST"
    USER_ID_LIST = "TA_USER_ID_LIST"
    SPAN_ANNOTATIONS = "TA_SPAN_ANNOTATIONS"

    def get_filter_column(self, **kwargs):
        subquery_dict = kwargs["subquery_dict"]

        match self:
            case TimelineAnalysisColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST:
                return subquery_dict[TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST]
            case TimelineAnalysisColumns.CODE_ID_LIST:
                return subquery_dict[TimelineAnalysisColumns.CODE_ID_LIST]
            case TimelineAnalysisColumns.USER_ID_LIST:
                return subquery_dict[TimelineAnalysisColumns.USER_ID_LIST]
            case TimelineAnalysisColumns.SPAN_ANNOTATIONS:
                return subquery_dict[TimelineAnalysisColumns.SPAN_ANNOTATIONS]

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

    def get_sort_column(self, **kwargs):
        match self:
            case TimelineAnalysisColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST:
                return DocumentTagORM.name
            case TimelineAnalysisColumns.CODE_ID_LIST:
                return None
            case TimelineAnalysisColumns.USER_ID_LIST:
                return UserORM.first_name
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

    def get_select(self):
        match self:
            case TimelineAnalysisColumns.SOURCE_DOCUMENT_FILENAME:
                return None
            case TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST:
                tag_ids_agg = aggregate_ids(
                    DocumentTagORM.id,
                    label=TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST,
                )
                return tag_ids_agg
            case TimelineAnalysisColumns.CODE_ID_LIST:
                code_ids_agg = aggregate_ids(
                    CodeORM.id, TimelineAnalysisColumns.CODE_ID_LIST
                )
                return code_ids_agg
            case TimelineAnalysisColumns.USER_ID_LIST:
                user_ids_agg = aggregate_ids(
                    UserORM.id, TimelineAnalysisColumns.USER_ID_LIST
                )
                return user_ids_agg
            case TimelineAnalysisColumns.SPAN_ANNOTATIONS:
                span_annotation_tuples_agg = cast(
                    array_agg(
                        func.distinct(
                            array([cast(CodeORM.id, String), SpanTextORM.text])
                        ),
                    ),
                    ARRAY(String, dimensions=2),
                ).label(TimelineAnalysisColumns.SPAN_ANNOTATIONS)
                return span_annotation_tuples_agg

    def get_joins(self):
        match self:
            case TimelineAnalysisColumns.SOURCE_DOCUMENT_FILENAME:
                return []
            case TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST:
                # SourceDocumentORM.document_tags, isouter=True
                return [SourceDocumentORM.document_tags]
            case TimelineAnalysisColumns.CODE_ID_LIST:
                return [
                    SourceDocumentORM.annotation_documents,
                    AnnotationDocumentORM.span_annotations,
                    SpanAnnotationORM.code,
                ]
            case TimelineAnalysisColumns.USER_ID_LIST:
                return [
                    SourceDocumentORM.annotation_documents,
                    AnnotationDocumentORM.user,
                ]
            case TimelineAnalysisColumns.SPAN_ANNOTATIONS:
                return [
                    SourceDocumentORM.annotation_documents,
                    AnnotationDocumentORM.span_annotations,
                    SpanAnnotationORM.code,
                    SpanAnnotationORM.span_text,
                ]
