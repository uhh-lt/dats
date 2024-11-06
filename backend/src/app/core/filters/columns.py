from enum import Enum, EnumMeta
from typing import Generic, TypeVar, Union

from pydantic import BaseModel

from app.core.filters.filtering_operators import FilterOperator, FilterValueType


class AbstractColumns(Enum, metaclass=EnumMeta):
    def get_filter_column(self, **kwargs):
        raise NotImplementedError

    def get_sort_column(self, **kwargs):
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


T = TypeVar("T", bound=AbstractColumns)


class ColumnInfo(BaseModel, Generic[T]):
    label: str
    column: Union[T, int]  # TODO: Annotatoed[, SkipValidation] with pydantic 2.4
    sortable: bool
    operator: FilterOperator
    value: FilterValueType

    @classmethod
    def from_column(cls, column: T) -> "ColumnInfo[T]":
        return ColumnInfo(
            label=column.get_label(),
            column=column,
            sortable=column.get_sort_column() is not None,
            operator=column.get_filter_operator(),
            value=column.get_filter_value_type(),
        )
