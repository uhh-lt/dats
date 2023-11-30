from enum import Enum
from typing import Generic, List, TypeVar

from pydantic import BaseModel
from sqlalchemy import Column, asc, desc

from app.core.filters.columns import AbstractColumns


class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"

    def apply(self, column: Column):
        match self:
            case SortDirection.ASC:
                return asc(column).nulls_last()
            case SortDirection.DESC:
                return desc(column).nulls_last()


T = TypeVar("T", bound=AbstractColumns)


class Sort(BaseModel, Generic[T]):
    """A sort expressions for sorting on many database columns"""

    column: T
    direction: SortDirection

    def get_sqlalchemy_expression(self):
        return self.direction.apply(self.column.get_sort_column())


def apply_sorting(query, sorts: List[Sort]):
    if len(sorts) == 0:
        return query
    return query.order_by(*[s.get_sqlalchemy_expression() for s in sorts])
