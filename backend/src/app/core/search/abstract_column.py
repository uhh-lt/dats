from enum import Enum, EnumMeta
from typing import TYPE_CHECKING, Any, List

from sqlalchemy.orm import Session
from sqlalchemy.sql.base import ReadOnlyColumnCollection

from app.core.search.filtering_operators import FilterOperator, FilterValueType

if TYPE_CHECKING:
    from app.core.search.search_builder import SearchBuilder


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

    def add_subquery_filter_statements(self, query_builder: "SearchBuilder"):
        raise NotImplementedError

    def add_query_filter_statements(self, query_builder: "SearchBuilder"):
        raise NotImplementedError

    def resolve_ids(self, db: Session, ids: List[int]) -> List[str]:
        raise NotImplementedError

    def resolve_names(self, db: Session, names: List[str]) -> List[int]:
        raise NotImplementedError
