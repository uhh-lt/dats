from enum import Enum, EnumMeta
from typing import Any

from sqlalchemy.sql.base import ReadOnlyColumnCollection

from app.core.filters.filtering_operators import FilterOperator, FilterValueType


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
