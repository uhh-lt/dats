from enum import Enum
from typing import Generic, TypeVar

from pydantic import BaseModel, Field
from sqlalchemy import case, func, literal

from systems.search_system.abstract_column import AbstractColumns
from systems.search_system.filtering import Filter
from systems.search_system.search_system_exceptions import ColumnNotGroupableError

T = TypeVar("T", bound=AbstractColumns)

# Key used for the group that collects rows whose grouping value is NULL. Such
# groups are always sorted last (see apply_grouping).
NONE_GROUP_KEY = "__none__"


class DateGranularity(str, Enum):
    """Bucket size used when grouping a date column."""

    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"


class GroupExpressions:
    """SQL expressions a column provides so SearchBuilder can group by it.

    key:         expression used in GROUP BY and for drill-down filtering. This
                 defines the partition — grouping is always by key, never by label.
    label:       human-readable label expression for the group header. Functionally
                 dependent on key, so it does not change the partition; it exists so
                 groups can be ordered alphabetically and displayed without a second
                 lookup.
    target_id:   optional expression yielding the ID of the object the group
                 points to (for drill-down navigation)
    target_type: optional expression yielding the type of the target object
    """

    def __init__(self, key, label, target_id=None, target_type=None):
        self.key = key
        self.label = label
        self.target_id = target_id
        self.target_type = target_type


class GroupConfig(BaseModel, Generic[T]):
    """Request to group results by `field`, optionally bucketing dates by
    `date_granularity`."""

    field: T = Field(description="The column to group results by")
    date_granularity: DateGranularity | None = Field(
        default=None,
        description="Bucket size for grouping a date column (day/week/month/year). "
        "Only meaningful when `field` is a date column; ignored otherwise.",
    )


class GroupSummary(BaseModel):
    """One group: its key, display label, member count, and optional target."""

    key: str = Field(
        description=(
            "Stable identity of the group (an id, date bucket, first letter, or "
            "boolean). Defines the partition — grouping is always by key, never by "
            "label. The frontend sends this back as `group_key` to drill into the "
            "group."
        )
    )
    label: str = Field(
        description="Human-readable name shown as the group header. Functionally "
        "dependent on `key`; used for display and alphabetical ordering."
    )
    total_results: int = Field(description="Number of rows in this group")
    target_id: int | None = Field(
        default=None,
        description="ID of the object this group points to (for drill-down "
        "navigation), if the group corresponds to a navigable object.",
    )
    target_type: str | None = Field(
        default=None,
        description="Type of the target object (an AttachedObjectType), if set.",
    )


class GroupPage(BaseModel):
    """A paginated list of groups."""

    items: list[GroupSummary] = Field(description="The groups on the requested page")
    total_results: int = Field(
        description="Total number of groups (unpaginated), used for pagination"
    )


class GroupQueryRequest(BaseModel, Generic[T]):
    """Request for a page of groups over a project's search results.

    - `filter`: the column filter tree applied before grouping.
    - `group_by`: the column (and optional date granularity) to group by.
    """

    project_id: int = Field(description="Project the search runs in")
    search_query: str = Field(
        default="", description="Full-text query applied before grouping"
    )
    filter: Filter[T] = Field(description="Column filter tree applied before grouping")
    group_by: GroupConfig[T] = Field(
        description="The column (and optional date granularity) to group by"
    )
    page_number: int = Field(default=0, ge=0, description="Zero-based page index")
    page_size: int = Field(
        default=20, ge=1, le=100, description="Number of groups per page"
    )


def apply_drill_down(query, group_by: GroupConfig, group_key: str, subquery_dict):
    """Restrict a row query to the single group identified by `group_key`.

    Resolves the grouping column's `GroupExpressions` and filters the query to rows
    whose group key equals `group_key` (`exprs.key == group_key`). This is the
    drill-down half of the grouped-view pattern: the `/groups` endpoint returns the
    buckets, and the frontend sends one bucket's `key` back as `group_key` to list
    the rows inside it.

    Raises ColumnNotGroupableError if the column does not support grouping.
    """
    exprs = group_by.field.get_group_expressions(
        subquery_dict, group_by.date_granularity
    )
    if exprs is None:
        raise ColumnNotGroupableError(group_by.field)
    return query.filter(exprs.key == group_key)


def apply_grouping(query, group_by: GroupConfig, subquery_dict):
    """Rewrite `query` into a grouped aggregate query.

    Resolves the grouping column's `GroupExpressions` and rewrites the query to
    select `(group_key, group_label, total_results[, target_id, target_type])`,
    grouped by key/label (and targets when present). Groups with a missing key
    (`NONE_GROUP_KEY`) are sorted last; date groups are ordered newest-first, all
    others alphabetically by label.

    Raises ColumnNotGroupableError if the column does not support grouping.
    """
    exprs = group_by.field.get_group_expressions(
        subquery_dict, group_by.date_granularity
    )
    if exprs is None:
        raise ColumnNotGroupableError(group_by.field)

    selected = [
        exprs.key.label("group_key"),
        exprs.label.label("group_label"),
        func.count().label("total_results"),
    ]
    grouped_columns = [exprs.key, exprs.label]
    if exprs.target_id is not None:
        selected.append(exprs.target_id.label("target_id"))
        grouped_columns.append(exprs.target_id)
    if exprs.target_type is not None:
        if isinstance(exprs.target_type, str):
            # A constant target type: select it, but a constant must not appear
            # in GROUP BY (Postgres would read a bare string literal there as a
            # column ordinal).
            selected.append(literal(exprs.target_type).label("target_type"))
        else:
            selected.append(exprs.target_type.label("target_type"))
            grouped_columns.append(exprs.target_type)

    query = query.with_entities(*selected).group_by(*grouped_columns)

    missing_group = case((exprs.key == NONE_GROUP_KEY, 1), else_=0)
    if group_by.date_granularity is not None:
        # date groups: newest bucket first
        return query.order_by(missing_group.asc(), exprs.key.desc())
    return query.order_by(missing_group.asc(), exprs.label.asc())
