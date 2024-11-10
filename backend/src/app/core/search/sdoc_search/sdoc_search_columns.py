from app.core.data.orm.source_document import SourceDocumentORM
from app.core.filters.column_info import AbstractColumns
from app.core.filters.filtering_operators import FilterOperator, FilterValueType


class SearchColumns(str, AbstractColumns):
    SOURCE_DOCUMENT_TYPE = "SC_SOURCE_DOCUMENT_TYPE"
    SOURCE_DOCUMENT_FILENAME = "SC_SOURCE_DOCUMENT_FILENAME"
    DOCUMENT_TAG_ID_LIST = "SC_DOCUMENT_TAG_ID_LIST"
    CODE_ID_LIST = "SC_CODE_ID_LIST"
    USER_ID_LIST = "SC_USER_ID_LIST"
    SPAN_ANNOTATIONS = "SC_SPAN_ANNOTATIONS"

    def get_filter_column(self, subquery_dict: dict):
        match self:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case SearchColumns.SOURCE_DOCUMENT_TYPE:
                return SourceDocumentORM.doctype
            case SearchColumns.DOCUMENT_TAG_ID_LIST:
                return subquery_dict[SearchColumns.DOCUMENT_TAG_ID_LIST.value]
            case SearchColumns.CODE_ID_LIST:
                return subquery_dict[SearchColumns.CODE_ID_LIST.value]
            case SearchColumns.USER_ID_LIST:
                return subquery_dict[SearchColumns.USER_ID_LIST.value]
            case SearchColumns.SPAN_ANNOTATIONS:
                return subquery_dict[SearchColumns.SPAN_ANNOTATIONS.value]

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterOperator.STRING
            case SearchColumns.SOURCE_DOCUMENT_TYPE:
                return FilterOperator.ID
            case SearchColumns.DOCUMENT_TAG_ID_LIST:
                return FilterOperator.ID_LIST
            case SearchColumns.CODE_ID_LIST:
                return FilterOperator.ID_LIST
            case SearchColumns.USER_ID_LIST:
                return FilterOperator.ID_LIST
            case SearchColumns.SPAN_ANNOTATIONS:
                return FilterOperator.ID_LIST

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case SearchColumns.SOURCE_DOCUMENT_TYPE:
                return FilterValueType.DOC_TYPE
            case SearchColumns.DOCUMENT_TAG_ID_LIST:
                return FilterValueType.TAG_ID
            case SearchColumns.CODE_ID_LIST:
                return FilterValueType.CODE_ID
            case SearchColumns.USER_ID_LIST:
                return FilterValueType.USER_ID
            case SearchColumns.SPAN_ANNOTATIONS:
                return FilterValueType.SPAN_ANNOTATION

    def get_sort_column(self):
        match self:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case SearchColumns.SOURCE_DOCUMENT_TYPE:
                return SourceDocumentORM.doctype
            case SearchColumns.DOCUMENT_TAG_ID_LIST:
                return None
            case SearchColumns.CODE_ID_LIST:
                return None
            case SearchColumns.USER_ID_LIST:
                return None
            case SearchColumns.SPAN_ANNOTATIONS:
                return None

    def get_label(self) -> str:
        match self:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return "Document name"
            case SearchColumns.SOURCE_DOCUMENT_TYPE:
                return "Type"
            case SearchColumns.DOCUMENT_TAG_ID_LIST:
                return "Tags"
            case SearchColumns.CODE_ID_LIST:
                return "Code"
            case SearchColumns.USER_ID_LIST:
                return "Annotated by"
            case SearchColumns.SPAN_ANNOTATIONS:
                return "Span annotations"
