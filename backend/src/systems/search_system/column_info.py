from typing import Generic, TypeVar

from pydantic import BaseModel

from core.metadata.project_metadata_dto import ProjectMetadataRead
from systems.search_system.abstract_column import AbstractColumns
from systems.search_system.filtering_operators import FilterOperator, FilterValueType

T = TypeVar("T", bound=AbstractColumns)


class ColumnInfo(BaseModel, Generic[T]):
    label: str
    column: T | int  # TODO: Annotatoed[, SkipValidation] with pydantic 2.4
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

    @classmethod
    def from_project_metadata(
        cls, project_metadata: ProjectMetadataRead
    ) -> "ColumnInfo":
        return ColumnInfo(
            label=f"{project_metadata.doctype.value}-{project_metadata.key}",
            column=project_metadata.id,
            sortable=True,
            operator=project_metadata.metatype.get_filter_operator(),
            value=FilterValueType.INFER_FROM_OPERATOR,
        )
