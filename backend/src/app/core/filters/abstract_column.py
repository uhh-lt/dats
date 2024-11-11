from enum import Enum, EnumMeta
from typing import TYPE_CHECKING, Any

from sqlalchemy.sql.base import ReadOnlyColumnCollection

from app.core.filters.filtering_operators import FilterOperator, FilterValueType

if TYPE_CHECKING:
    from app.core.filters.search_builder import SearchBuilder


class AbstractColumns(Enum, metaclass=EnumMeta):
    def get_filter_column(self, subquery_dict: ReadOnlyColumnCollection[str, Any]):
        raise NotImplementedError

    def get_sort_column(self):
        raise NotImplementedError

    def get_filter_operator(self) -> FilterOperator:
        raise NotImplementedError

    def get_label(self) -> str:
        raise NotImplementedError

    def get_filter_value_type(self) -> FilterValueType:
        raise NotImplementedError

    def get_select(self):
        raise NotImplementedError

    def get_joins(self):
        raise NotImplementedError

    def add_subquery_filter_statements(self, query_builder: "SearchBuilder"):
        raise NotImplementedError

    def add_query_filter_statements(self, query_builder: "SearchBuilder"):
        raise NotImplementedError
