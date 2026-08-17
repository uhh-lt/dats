from enum import Enum
from typing import Generic, TypeVar

from pydantic import BaseModel, Field
from sqlalchemy import asc, desc
from sqlalchemy.orm import QueryableAttribute

from systems.search_system.abstract_column import AbstractColumns

T = TypeVar("T", bound=AbstractColumns)


class SortDirection(str, Enum):
    """Sort direction. `apply` appends `.nulls_last()` so rows missing a value sink
    to the bottom regardless of direction."""

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

    column: T | int = Field(
        description="The column to sort by: an enum member, or an int id "
        "referring to a project-metadata column"
    )
    direction: SortDirection = Field(description="Sort direction (asc/desc)")

    def get_sqlalchemy_expression(self, subquery_dict):
        """Resolve this sort to a SQLAlchemy ORDER BY expression.

        An `int` column refers to a project-metadata subquery column labelled
        `METADATA-<id>`; an enum column resolves via `get_sort_column(subquery_dict)`
        so it can sort by a computed/label column rather than a raw id.
        """
        if isinstance(self.column, int):
            return self.direction.apply(subquery_dict[f"METADATA-{self.column}"])

        # This is a regular column
        return self.direction.apply(self.column.get_sort_column(subquery_dict))


def apply_sorting(query, sorts: list[Sort], subquery_dict):
    """Apply the given sorts to the query in order. No-op if `sorts` is empty."""
    if len(sorts) == 0:
        return query
    return query.order_by(
        *[s.get_sqlalchemy_expression(subquery_dict=subquery_dict) for s in sorts]
    )


def get_columns_affected_by_sorts(sorts: list[Sort[T]]) -> set[T | int]:
    """Collect the set of columns referenced by the given sorts."""
    columns: set[T | int] = set()
    for sort in sorts:
        columns.add(sort.column)
    return columns
