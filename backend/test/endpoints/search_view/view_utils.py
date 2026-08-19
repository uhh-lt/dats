"""Shared helpers for search-view endpoint tests."""

from systems.search_system.abstract_column import AbstractColumns
from systems.search_system.filtering import Filter, FilterExpression, LogicalOperator
from systems.search_system.filtering_operators import StringOperator


def string_filter_tree(column: AbstractColumns, value: str) -> Filter:
    """A minimal valid filter tree: one STRING_CONTAINS expression on `column`."""
    return Filter(
        id="root",
        logic_operator=LogicalOperator.and_,
        items=[
            FilterExpression(
                id="expr-1",
                column=column,
                operator=StringOperator.CONTAINS,
                value=value,
            )
        ],
    )
