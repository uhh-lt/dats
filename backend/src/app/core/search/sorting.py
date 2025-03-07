from enum import Enum
from typing import Generic, List, Set, TypeVar, Union

from pydantic import BaseModel
from sqlalchemy import asc, desc
from sqlalchemy.orm import QueryableAttribute

from app.core.search.abstract_column import AbstractColumns

T = TypeVar("T", bound=AbstractColumns)


class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"

    def apply(self, column: QueryableAttribute):
        match self:
            case SortDirection.ASC:
                return asc(column).nulls_last()
            case SortDirection.DESC:
                return desc(column).nulls_last()


class Sort(BaseModel, Generic[T]):
    """A sort expressions for sorting on many database columns"""

    column: Union[T, int]
    direction: SortDirection

    def get_sqlalchemy_expression(self, subquery_dict):
        if isinstance(self.column, int):
            return self.direction.apply(subquery_dict[f"METADATA-{self.column}"])

        # This is a regular column
        return self.direction.apply(self.column.get_sort_column())


def apply_sorting(query, sorts: List[Sort], subquery_dict):
    if len(sorts) == 0:
        return query
    return query.order_by(
        *[s.get_sqlalchemy_expression(subquery_dict=subquery_dict) for s in sorts]
    )


def get_columns_affected_by_sorts(sorts: List[Sort[T]]) -> Set[Union[T, int]]:
    columns: Set[Union[T, int]] = set()
    for sort in sorts:
        columns.add(sort.column)
    return columns
