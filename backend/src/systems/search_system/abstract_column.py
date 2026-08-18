from enum import Enum, EnumMeta
from typing import TYPE_CHECKING, Any

from sqlalchemy.orm import Session
from sqlalchemy.sql.base import ReadOnlyColumnCollection

from systems.search_system.filtering_operators import FilterOperator, FilterValueType

if TYPE_CHECKING:
    from common.crud_enum import Crud
    from systems.search_system.grouping import DateGranularity, GroupExpressions
    from systems.search_system.search_builder import SearchBuilder


class AbstractColumns(Enum, metaclass=EnumMeta):
    """Contract for a searchable entity's column enum.

    Each searchable entity (source documents, annotations, memos, ...) defines an
    enum inheriting from this class. Every member is one searchable column, and the
    methods below are the **hooks** the search engine calls to build queries
    generically. The engine never hardcodes entity specifics — it only knows this
    contract.

    The `subquery_dict` argument passed to several hooks is the built subquery's
    column collection (`subquery.c`), keyed by column label. It lets a hook resolve
    computed or joined expressions (e.g. an author's full name) rather than only
    base ORM columns. See the module README for the full mental model.
    """

    def get_filter_column(self, subquery_dict: ReadOnlyColumnCollection[str, Any]):
        """SQL expression used in `WHERE` for this column.

        Typically `subquery_dict[self.value]` when the column is projected into the
        subquery, or a direct ORM column otherwise.
        """
        raise NotImplementedError

    def get_sort_column(self, subquery_dict=None):
        """SQL expression used in `ORDER BY` for this column.

        Return `None` to mark the column as non-sortable (used by `ColumnInfo` to
        report sortability). `subquery_dict` is optional: it is `None` when called
        purely as a sortability probe, and the real collection during actual sorting.
        Prefer sorting by a human-readable label (via `subquery_dict`) over a raw id.
        """
        raise NotImplementedError

    def get_filter_operator(self) -> FilterOperator:
        """The operator family (string, id, date, ...) this column supports."""
        raise NotImplementedError

    def get_label(self) -> str:
        """Human-readable column label shown in the frontend."""
        raise NotImplementedError

    def get_filter_value_type(self) -> FilterValueType:
        """How the frontend renders the value picker for this column."""
        raise NotImplementedError

    def add_subquery_filter_statements(self, query_builder: "SearchBuilder"):
        """Augment the **subquery** (add columns / joins) needed by this column.

        Called during `SearchBuilder.build_subquery` for every affected column.
        """
        raise NotImplementedError

    def add_query_filter_statements(self, query_builder: "SearchBuilder"):
        """Augment the **outer query** (joins) needed by this column.

        Called during `SearchBuilder.build_query` for every affected column.
        """
        raise NotImplementedError

    def get_group_expressions(
        self,
        subquery_dict,
        date_granularity: "DateGranularity | None",
    ) -> "GroupExpressions | None":
        """Return the SQL expressions needed to group by this column.

        The returned `GroupExpressions.key` defines the partition (grouping is always
        by key, never by label); `label` is only for display and group ordering.
        `date_granularity` is set when grouping a date column by day/week/month/year.

        Return None (the default) if this column does not support grouping. A column
        that supports grouping must also return True from `is_groupable`.
        """
        return None

    def is_groupable(self) -> bool:
        """Whether this column supports grouping.

        This is the search system's single source of truth for groupability,
        reported to the frontend via `ColumnInfo.groupable`. It is a cheap,
        side-effect-free capability declaration — unlike `get_group_expressions`,
        it needs no built subquery, so it can be probed at any time.

        A column that returns True here MUST also return a non-None
        `GroupExpressions` from `get_group_expressions`. Defaults to False.
        """
        return False

    def resolve_ids(
        self, db: Session, ids: list[int], types: list["Crud"] | None = None
    ) -> list[str]:
        """Map database ids to display names (for filter round-trips).

        `types` is only set for polymorphic columns (e.g. memo ATTACHED_OBJECT): it
        carries the Crud entity token aligned with each id, so the column can resolve
        against the correct table instead of probing all of them. Mono-typed columns
        ignore it.
        """
        raise NotImplementedError

    def resolve_names(
        self,
        db: Session,
        project_id: int,
        names: list[str],
        types: list["Crud"] | None = None,
    ) -> list[int]:
        """Map display names back to database ids within a project.

        See `resolve_ids` for the meaning of `types`.
        """
        raise NotImplementedError
