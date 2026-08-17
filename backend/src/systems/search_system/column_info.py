from typing import Generic, TypeVar

from pydantic import BaseModel, Field

from core.metadata.project_metadata_dto import ProjectMetadataRead
from systems.search_system.abstract_column import AbstractColumns
from systems.search_system.filtering_operators import FilterOperator, FilterValueType

T = TypeVar("T", bound=AbstractColumns)


class ColumnInfo(BaseModel, Generic[T]):
    """Self-description of one searchable column, sent to the frontend.

    Tells the frontend how to render a column in the filter dialog and what it can
    do: its display `label`, its `sortable` and `groupable` capability flags, the
    `operator` family it supports, and the `value` type used to pick an appropriate
    value selector.
    """

    label: str = Field(description="Display label of the column")
    column: T | int = Field(  # TODO: Annotated[, SkipValidation] with pydantic 2.4
        description="The column: an enum member, or an int id referring to a "
        "project-metadata column"
    )
    sortable: bool = Field(description="Whether the column can be sorted")
    groupable: bool = Field(description="Whether the column can be grouped")
    operator: FilterOperator = Field(
        description="The operator family the column supports for filtering"
    )
    value: FilterValueType = Field(
        description="The value type used to pick an appropriate value selector"
    )

    @classmethod
    def from_column(cls, column: T) -> "ColumnInfo[T]":
        """Build a ColumnInfo from a column enum member.

        Sortability is probed via `get_sort_column(subquery_dict=None)`; a column is
        sortable iff that returns a non-None expression. Groupability is declared
        explicitly via `is_groupable()`.
        """
        return ColumnInfo(
            label=column.get_label(),
            column=column,
            sortable=column.get_sort_column(subquery_dict=None) is not None,
            groupable=column.is_groupable(),
            operator=column.get_filter_operator(),
            value=column.get_filter_value_type(),
        )

    @classmethod
    def from_project_metadata(
        cls, project_metadata: ProjectMetadataRead
    ) -> "ColumnInfo":
        """Build a ColumnInfo for a project-metadata column (int id column)."""
        return ColumnInfo(
            label=f"{project_metadata.doctype.value}-{project_metadata.key}",
            column=project_metadata.id,
            sortable=True,
            groupable=False,
            operator=project_metadata.metatype.get_filter_operator(),
            value=FilterValueType.INFER_FROM_OPERATOR,
        )
