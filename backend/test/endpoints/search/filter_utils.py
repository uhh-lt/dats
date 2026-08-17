"""Shared filter-tree builders for search endpoint tests.

These are plain helper functions (not fixtures) used by both the memo and
annotation test modules to construct `Filter`/`FilterExpression` trees.
"""

from systems.search_system.filtering import Filter, FilterExpression, LogicalOperator


def make_filter_expr(expr_id: str, column, operator, value) -> FilterExpression:
    return FilterExpression(id=expr_id, column=column, operator=operator, value=value)


def make_filter_tree(
    items: list, logic: LogicalOperator = LogicalOperator.and_
) -> Filter:
    return Filter(id="root", items=items, logic_operator=logic)


def empty_filter() -> Filter:
    return make_filter_tree([])
