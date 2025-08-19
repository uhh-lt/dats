from enum import Enum
from typing import Generic, TypeVar, Union

from pydantic import BaseModel
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from systems.search_system.abstract_column import AbstractColumns
from systems.search_system.filtering_operators import (
    BooleanOperator,
    DateOperator,
    FilterValue,
    IDListOperator,
    IDOperator,
    ListOperator,
    NumberOperator,
    StringOperator,
)

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
    column: T | int
    operator: (
        IDOperator
        | NumberOperator
        | StringOperator
        | IDListOperator
        | ListOperator
        | DateOperator
        | BooleanOperator
    )
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

    def resolve_ids(self, db: Session) -> "FilterExpression[T]":
        # We don't need to resolve IDs for metadata columns
        if isinstance(self.column, int):
            return self

        # Resolve IDs for IDOperator
        if self.operator == IDOperator.EQUALS or self.operator == IDOperator.NOT_EQUALS:
            assert isinstance(self.value, int), f"Expected int, got {type(self.value)}"
            resolved_ids = self.column.resolve_ids(db=db, ids=[int(self.value)])
            if len(resolved_ids) == 0:
                raise ValueError(
                    f"ID '{self.value}' not found for column {self.column}"
                )
            self.value = resolved_ids[0]
            return self

        # Resolve IDs for IDListOperator
        if (
            self.operator == IDListOperator.CONTAINS
            or self.operator == IDListOperator.NOT_CONTAINS
        ):
            if isinstance(self.value, str):
                ids = [int(self.value)]
            elif isinstance(self.value, int):
                ids = [int(self.value)]
            elif isinstance(self.value, list):
                ids = []
                for id in self.value:
                    assert isinstance(id, int), f"Expected int, got {type(id)}"
                    ids.append(int(id))
            else:
                ids = []

            resolved_ids = self.column.resolve_ids(db=db, ids=ids)
            if len(ids) > 1 and len(resolved_ids) == 0:
                raise ValueError(f"IDs '{ids}' not found for column {self.column}")
            self.value = resolved_ids
            return self

        return self

    def resolve_names(self, db: Session, project_id: int) -> "FilterExpression[T]":
        # We don't need to resolve names for metadata columns
        if isinstance(self.column, int):
            return self

        # Resolve names for IDOperator
        if self.operator == IDOperator.EQUALS or self.operator == IDOperator.NOT_EQUALS:
            assert isinstance(self.value, str), f"Expected str, got {type(self.value)}"
            resolved_names = self.column.resolve_names(
                db=db, project_id=project_id, names=[self.value]
            )
            if len(resolved_names) == 0:
                raise ValueError(f"'{self.value}' not found for column {self.column}")
            self.value = resolved_names[0]
            return self

        # Resolve names for IDListOperator
        if (
            self.operator == IDListOperator.CONTAINS
            or self.operator == IDListOperator.NOT_CONTAINS
        ):
            if isinstance(self.value, str):
                names = [self.value]
            elif isinstance(self.value, list):
                names = []
                for name in self.value:
                    assert isinstance(name, str), f"Expected str, got {type(name)}"
                    names.append(name)
            else:
                names = []

            resolved_names = [
                str(id)
                for id in self.column.resolve_names(
                    db=db, project_id=project_id, names=names
                )
            ]
            if len(names) > 0 and len(resolved_names) == 0:
                raise ValueError(
                    f"Names '{self.value}' not found for column {self.column}"
                )
            self.value = resolved_names
            return self

        return self


class Filter(BaseModel, Generic[T]):
    """A tree of column expressions for filtering on many database columns using various
    comparisons."""

    id: str
    items: list[Union[FilterExpression[T], "Filter[T]"]]
    logic_operator: LogicalOperator

    def get_sqlalchemy_expression(self, subquery_dict):
        op = self.logic_operator.get_sqlalchemy_operator()
        return op(*[f.get_sqlalchemy_expression(subquery_dict) for f in self.items])

    @classmethod
    def resolve_ids(cls, filter: "Filter[T]", db: Session) -> "Filter[T]":
        """
        Resolve IDs for all FilterExpressions in the filter tree.
        Args:
            db: Database session
        Returns:
            Filter: A new Filter instance with resolved IDs.
        """

        resolved = filter.model_copy(deep=True)
        resolved_items: list[Union[FilterExpression[T], "Filter[T]"]] = []

        # Resolve IDs for each FilterExpression in the filter
        for item in filter.items:
            if isinstance(item, FilterExpression):
                resolved_items.append(item.resolve_ids(db=db))
            else:
                resolved_items.append(Filter.resolve_ids(item, db=db))
        resolved.items = resolved_items

        return resolved

    @classmethod
    def resolve_names(
        cls, filter: "Filter[T]", db: Session, project_id: int
    ) -> "Filter[T]":
        """
        Resolve names for all FilterExpressions in the filter tree.
        (This is the opposite of resolve_ids)
        Args:
            db: Database session
        Returns:
            Filter: A new Filter instance with resolved names.
        """

        resolved = filter.model_copy(deep=True)
        resolved_items: list[Union[FilterExpression[T], "Filter[T]"]] = []

        # Resolve names for each FilterExpression in the filter
        for item in filter.items:
            if isinstance(item, FilterExpression):
                resolved_items.append(item.resolve_names(db=db, project_id=project_id))
            else:
                resolved_items.append(
                    Filter.resolve_names(item, db=db, project_id=project_id)
                )
        resolved.items = resolved_items

        return resolved


Filter.model_rebuild()


def apply_filtering(
    query,
    filter: Filter,
    subquery_dict,
):
    return query.filter(filter.get_sqlalchemy_expression(subquery_dict))


def get_columns_affected_by_filter(filter: Filter[T]) -> set[T | int]:
    columns: set[T | int] = set()
    for item in filter.items:
        if isinstance(item, FilterExpression):
            columns.add(item.column)
        else:
            columns.update(get_columns_affected_by_filter(item))
    return columns
