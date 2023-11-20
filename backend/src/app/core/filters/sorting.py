from enum import Enum
from typing import Generic, List, TypeVar

from app.core.filters.columns import AbstractColumns
from pydantic.generics import GenericModel
from sqlalchemy import Column


class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"

    def apply(self, column: Column):
        match self:
            case SortDirection.ASC:
                return column.asc().nulls_last()
            case SortDirection.DESC:
                return column.desc().nulls_last()


T = TypeVar("T", bound=AbstractColumns)


class Sort(GenericModel, Generic[T]):
    """A sort expressions for sorting on many database columns"""

    column: T
    direction: SortDirection

    def get_sqlalchemy_expression(self):
        return self.direction.apply(self.column.get_sort_column())


def apply_sorting(query, sorts: List[Sort]):
    return query.order_by(*[s.get_sqlalchemy_expression() for s in sorts])
