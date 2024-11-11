from enum import Enum
from typing import Generic, List, Set, TypeVar, Union

from pydantic import BaseModel
from sqlalchemy import and_, or_

from app.core.filters.abstract_column import AbstractColumns
from app.core.filters.filtering_operators import (
    BooleanOperator,
    DateOperator,
    IDListOperator,
    IDOperator,
    ListOperator,
    NumberOperator,
    StringOperator,
)
from app.core.filters.types import FilterValue

T = TypeVar("T", bound=AbstractColumns)


class LogicalOperator(str, Enum):
    """This tells our filter how to combine multiple column expressions."""

    or_ = "or"
    and_ = "and"

    def get_sqlalchemy_operator(self):
        match self:
            case LogicalOperator.or_:
                return or_
            case LogicalOperator.and_:
                return and_


class FilterExpression(BaseModel, Generic[T]):
    id: str
    column: Union[T, int]
    operator: Union[
        IDOperator,
        NumberOperator,
        StringOperator,
        IDListOperator,
        ListOperator,
        DateOperator,
        BooleanOperator,
    ]
    value: FilterValue

    def get_sqlalchemy_expression(self, subquery_dict):
        if isinstance(self.column, int):
            return self.operator.apply(
                subquery_dict[f"METADATA-{self.column}"], value=self.value
            )

        else:
            return self.operator.apply(
                self.column.get_filter_column(subquery_dict), value=self.value
            )


class Filter(BaseModel, Generic[T]):
    """A tree of column expressions for filtering on many database columns using various
    comparisons."""

    id: str
    items: List[Union[FilterExpression[T], "Filter[T]"]]
    logic_operator: LogicalOperator

    def get_sqlalchemy_expression(self, subquery_dict):
        op = self.logic_operator.get_sqlalchemy_operator()
        return op(*[f.get_sqlalchemy_expression(subquery_dict) for f in self.items])


Filter.model_rebuild()


def apply_filtering(
    query,
    filter: Filter,
    subquery_dict,
):
    return query.filter(filter.get_sqlalchemy_expression(subquery_dict))


def get_columns_affected_by_filter(filter: Filter[T]) -> Set[Union[T, int]]:
    columns: Set[Union[T, int]] = set()
    for item in filter.items:
        if isinstance(item, FilterExpression):
            columns.add(item.column)
        else:
            columns.update(get_columns_affected_by_filter(item))
    return columns
