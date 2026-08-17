from core.memo.memo_orm import MemoORM
from systems.search_system.column_info import AbstractColumns
from systems.search_system.filtering_operators import FilterOperator, FilterValueType
from systems.search_system.search_builder import SearchBuilder


class MemoColumns(str, AbstractColumns):
    TITLE = "M_TITLE"
    CONTENT = "M_CONTENT"
    USER_ID = "M_USER_ID"
    ATTACHED_OBJECT_TYPE = "M_ATTACHED_OBJECT_TYPE"
    ATTACHED_OBJECT_ID = "M_ATTACHED_OBJECT_ID"
    SOURCE_DOCUMENT_ID = "M_SOURCE_DOCUMENT_ID"
    CODE_ID = "M_CODE_ID"
    CREATED = "M_CREATED"
    UPDATED = "M_UPDATED"
    FAVORITE = "M_FAVORITE"

    def get_filter_column(self, subquery_dict):
        if self == MemoColumns.TITLE:
            return MemoORM.title
        if self == MemoColumns.CONTENT:
            return MemoORM.content
        if self == MemoColumns.USER_ID:
            return MemoORM.user_id
        if self == MemoColumns.CREATED:
            return MemoORM.created
        if self == MemoColumns.UPDATED:
            return MemoORM.updated
        return subquery_dict[self.value]

    def get_filter_operator(self) -> FilterOperator:
        if self in {MemoColumns.TITLE, MemoColumns.CONTENT}:
            return FilterOperator.STRING
        if self in {
            MemoColumns.USER_ID,
            MemoColumns.ATTACHED_OBJECT_ID,
            MemoColumns.SOURCE_DOCUMENT_ID,
            MemoColumns.CODE_ID,
        }:
            return FilterOperator.ID
        if self in {MemoColumns.CREATED, MemoColumns.UPDATED}:
            return FilterOperator.DATE
        if self == MemoColumns.FAVORITE:
            return FilterOperator.BOOLEAN
        return FilterOperator.STRING

    def get_filter_value_type(self) -> FilterValueType:
        if self == MemoColumns.ATTACHED_OBJECT_TYPE:
            return FilterValueType.ATTACHED_OBJECT_TYPE
        if self == MemoColumns.USER_ID:
            return FilterValueType.USER_ID
        if self == MemoColumns.SOURCE_DOCUMENT_ID:
            return FilterValueType.SDOC_ID
        if self == MemoColumns.CODE_ID:
            return FilterValueType.CODE_ID
        return FilterValueType.INFER_FROM_OPERATOR

    def get_sort_column(self):
        if self == MemoColumns.TITLE:
            return MemoORM.title
        if self == MemoColumns.CONTENT:
            return MemoORM.content
        if self == MemoColumns.USER_ID:
            return MemoORM.user_id
        if self == MemoColumns.CREATED:
            return MemoORM.created
        if self == MemoColumns.UPDATED:
            return MemoORM.updated
        return MemoORM.id

    def get_label(self) -> str:
        labels = {
            MemoColumns.TITLE: "Title",
            MemoColumns.CONTENT: "Content",
            MemoColumns.USER_ID: "Author",
            MemoColumns.ATTACHED_OBJECT_TYPE: "Attached object type",
            MemoColumns.ATTACHED_OBJECT_ID: "Attached object",
            MemoColumns.SOURCE_DOCUMENT_ID: "Source document context",
            MemoColumns.CODE_ID: "Code context",
            MemoColumns.CREATED: "Created",
            MemoColumns.UPDATED: "Updated",
            MemoColumns.FAVORITE: "Favorite",
        }
        return labels[self]

    def add_query_filter_statements(self, query_builder: SearchBuilder):
        pass

    def add_subquery_filter_statements(self, query_builder: SearchBuilder):
        pass
