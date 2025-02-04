from app.core.data.orm.memo import MemoORM
from app.core.search.column_info import AbstractColumns
from app.core.search.filtering_operators import FilterOperator, FilterValueType
from app.core.search.search_builder import SearchBuilder


class MemoColumns(str, AbstractColumns):
    TITLE = "M_TITLE"
    CONTENT = "M_CONTENT"
    STARRED = "M_STARRED"
    USER_ID = "M_USER_ID"

    def get_filter_column(self, subquery_dict):
        match self:
            case MemoColumns.TITLE:
                return MemoORM.title
            case MemoColumns.CONTENT:
                return MemoORM.content
            case MemoColumns.STARRED:
                return MemoORM.starred
            case MemoColumns.USER_ID:
                return MemoORM.user_id

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case MemoColumns.TITLE:
                return FilterOperator.STRING
            case MemoColumns.CONTENT:
                return FilterOperator.STRING
            case MemoColumns.STARRED:
                return FilterOperator.BOOLEAN
            case MemoColumns.USER_ID:
                return FilterOperator.ID

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case MemoColumns.TITLE:
                return FilterValueType.INFER_FROM_OPERATOR
            case MemoColumns.CONTENT:
                return FilterValueType.INFER_FROM_OPERATOR
            case MemoColumns.STARRED:
                return FilterValueType.INFER_FROM_OPERATOR
            case MemoColumns.USER_ID:
                return FilterValueType.USER_ID

    def get_sort_column(self):
        match self:
            case MemoColumns.TITLE:
                return MemoORM.title
            case MemoColumns.CONTENT:
                return MemoORM.content
            case MemoColumns.STARRED:
                return MemoORM.starred
            case MemoColumns.USER_ID:
                return MemoORM.user_id

    def get_label(self) -> str:
        match self:
            case MemoColumns.TITLE:
                return "Title"
            case MemoColumns.CONTENT:
                return "Content"
            case MemoColumns.STARRED:
                return "Starred"
            case MemoColumns.USER_ID:
                return "User"

    def add_query_filter_statements(self, query_builder: SearchBuilder):
        pass

    def add_subquery_filter_statements(self, query_builder: SearchBuilder):
        pass
