from typing import TYPE_CHECKING, Any, TypeVar

from sqlalchemy import desc
from sqlalchemy.orm import Query, Session, aliased
from sqlalchemy.sql._typing import (
    _ColumnExpressionArgument,  # type: ignore
    _JoinTargetArgument,  # type: ignore
    _OnClauseArgument,  # type: ignore
)
from sqlalchemy.sql.base import ReadOnlyColumnCollection
from sqlalchemy.sql.selectable import Subquery

from common.meta_type import MetaType
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.project_metadata_dto import ProjectMetadataRead
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from systems.search_system.filtering import (
    Filter,
    apply_filtering,
    get_columns_affected_by_filter,
)
from systems.search_system.grouping import (
    NONE_GROUP_KEY,
    GroupConfig,
    apply_drill_down,
    apply_grouping,
)
from systems.search_system.pagination import apply_pagination
from systems.search_system.sorting import (
    Sort,
    apply_sorting,
    get_columns_affected_by_sorts,
)

if TYPE_CHECKING:
    from systems.search_system.abstract_column import AbstractColumns

T = TypeVar("T", bound="AbstractColumns")

__all__ = ["NONE_GROUP_KEY", "SearchBuilder"]


class SearchBuilder:
    """
    To debug a query, you should set a breakpoint in the `execute_query` method, e.g. after befor running the query with `query.all()`.
    Then, inspect the `self.query` and `self.subquery` attributes to see the built SQLAlchemy queries.
    You can convert them to raw SQL strings using the `str()` function, e.g.
    ```python
    str(query)
    ```
    This will give you the raw SQL that SQLAlchemy has generated, which you can then analyze or run directly against your database for debugging purposes.
    """

    def __init__(
        self,
        db: Session,
        filter: Filter[T],
        sorts: list[Sort[T]],
        group_by: GroupConfig[T] | None = None,
        group_key: str | None = None,
        user_id: int | None = None,
    ) -> None:
        """Create a builder for one search request.

        Args:
            db: Active database session.
            filter: The filter tree to apply.
            sorts: The sorts to apply (ignored when `group_by` is set).
            group_by: Optional grouping request. When set without `group_key`,
                `execute_query` returns aggregate group rows (`/groups`). When set
                together with `group_key`, the row query is instead restricted to
                that single group (drill-down).
            group_key: Optional drill-down key; only meaningful with `group_by`.
            user_id: Optional user context, available to columns that need it
                (e.g. per-user favorite flags).
        """
        self.db = db
        self.filter = filter
        self.sorts = sorts
        self.group_by = group_by
        self.group_key = group_key
        self.user_id = user_id
        self.joined_subquery_tables: list[str] = []
        self.joined_query_tables: list[str] = []
        self.selected_columns: list[str] = []
        self.subquery: Query | Subquery | None = None
        self.query: Query | None = None

        affected_columns = get_columns_affected_by_filter(self.filter)
        affected_columns.update(get_columns_affected_by_sorts(self.sorts))
        if group_by is not None:
            affected_columns.add(group_by.field)
        self.affected_columns = affected_columns

    def _add_subquery_column(self, column: _ColumnExpressionArgument[Any]):
        if self.subquery is None:
            raise ValueError("Subquery is not initialized!")

        if isinstance(self.subquery, Subquery):
            raise ValueError("Subquery is already built!")

        # make sure that this column was not selected before
        str_repr = str(column)
        if str_repr in self.selected_columns:
            return

        self.selected_columns.append(str_repr)
        self.subquery = self.subquery.add_column(column)

    def _join_query(
        self,
        target: _JoinTargetArgument,
        onclause: _OnClauseArgument | None = None,
        *,
        isouter: bool = False,
        full: bool = False,
    ) -> "SearchBuilder":
        if self.query is None:
            raise ValueError("Query is not initialized!")

        # make sure that this was not joined before
        str_repr = str(target) + str(onclause) + str(isouter) + str(full)
        if str_repr in self.joined_query_tables:
            return self

        self.joined_query_tables.append(str_repr)
        self.query = self.query.join(
            target,
            onclause=onclause,
            isouter=isouter,
            full=full,
        )

        return self

    def _join_subquery(
        self,
        target: _JoinTargetArgument,
        onclause: _OnClauseArgument | None = None,
        *,
        isouter: bool = False,
        full: bool = False,
    ) -> "SearchBuilder":
        if self.subquery is None:
            raise ValueError("Subquery is not initialized!")

        if isinstance(self.subquery, Subquery):
            raise ValueError("Subquery is already built!")

        # make sure that this was not joined before
        str_repr = str(target) + str(onclause) + str(isouter) + str(full)
        if str_repr in self.joined_subquery_tables:
            return self

        self.joined_subquery_tables.append(str_repr)
        self.subquery = self.subquery.join(
            target,
            onclause=onclause,
            isouter=isouter,
            full=full,
        )

        return self

    def _add_subquery_metadata_filter_statements(self, project_metadata_id: int):
        if self.subquery is None:
            raise ValueError("Subquery is not initialized!")

        if isinstance(self.subquery, Subquery):
            raise ValueError("Subquery is already built!")

        # select the correct value column based on the metadata type
        project_metadata = ProjectMetadataRead.model_validate(
            self.db.query(ProjectMetadataORM)
            .filter(ProjectMetadataORM.id == project_metadata_id)
            .first()
        )
        metadata = aliased(SourceDocumentMetadataORM)
        match project_metadata.metatype:
            case MetaType.STRING:
                metadata_value_column = metadata.str_value
            case MetaType.NUMBER:
                metadata_value_column = metadata.int_value
            case MetaType.DATE:
                metadata_value_column = metadata.date_value
            case MetaType.BOOLEAN:
                metadata_value_column = metadata.boolean_value
            case MetaType.LIST:
                metadata_value_column = metadata.list_value

        self.subquery = (
            self.subquery.add_column(
                metadata_value_column.label(f"METADATA-{project_metadata_id}")
            )
            .outerjoin(
                metadata,
                (SourceDocumentORM.id == metadata.source_document_id)
                & (metadata.project_metadata_id == project_metadata_id),
            )
            .group_by(metadata.id)
        )

    def init_subquery(self, subquery: Query) -> "SearchBuilder":
        """Provide the entity-specific base projection (step 1 of the lifecycle).

        This query selects the entity id plus every column needed for filtering,
        sorting, or grouping, along with the joins those columns require.
        """
        if self.subquery is not None:
            raise ValueError("Subquery was initialized already!")

        self.subquery = subquery

        return self

    def build_subquery(self) -> Subquery:
        """Let affected columns augment the subquery, then freeze it (step 2).

        Calls each affected column's `add_subquery_filter_statements` and converts
        the result into a `Subquery`. After this, the subquery is immutable and its
        columns are available via `subquery.c`.
        """
        if self.subquery is None:
            raise ValueError("Subquery was not initialized!")

        if isinstance(self.subquery, Subquery):
            raise ValueError("Subquery is already built!")

        for column in self.affected_columns:
            if isinstance(column, int):
                self._add_subquery_metadata_filter_statements(column)
            else:
                column.add_subquery_filter_statements(self)

        self.subquery = self.subquery.subquery()
        return self.subquery

    def init_query(self, query: Query) -> "SearchBuilder":
        """Provide the outer query over the built subquery (step 3)."""
        if self.query is not None:
            raise ValueError("Query was initialized already!")

        self.query = query

        return self

    def build_query(self) -> Query:
        """Let affected columns augment the outer query (step 4).

        Calls each affected column's `add_query_filter_statements` and returns the
        resulting query.
        """
        if self.query is None:
            raise ValueError("Query was not initialized!")

        for column in self.affected_columns:
            if isinstance(column, int):
                continue
            else:
                column.add_query_filter_statements(self)

        return self.query

    def execute_query(
        self, page_number: int | None, page_size: int | None
    ) -> tuple[list, int]:
        """Run the built query and return `(result_rows, total_results)`.

        Order of operations: filtering, then grouping **or** sorting, then
        pagination.

        - Filtering always applies the filter tree against the subquery columns.
        - If `group_by` is set, the query is rewritten to aggregate rows
          `(group_key, group_label, total_results[, target_id, target_type])` and
          sorted with missing-key groups last (date groups newest-first, others
          alphabetically by label).
        - Otherwise the given sorts are applied; with no sorts, the query falls back
          to ordering by its first column descending.
        - If both `page_number` and `page_size` are given, the query is paginated
          and `total_results` comes from the pagination count; otherwise all rows
          are returned and counted in Python.
        """
        if self.query is None:
            raise ValueError("Query is not initialized")

        subquery_dict: ReadOnlyColumnCollection[str, Any] | dict[str, Any] = {}
        if self.subquery is not None and isinstance(self.subquery, Subquery):
            subquery_dict = self.subquery.c

        # filtering
        query = apply_filtering(
            query=self.query,
            filter=self.filter,
            subquery_dict=subquery_dict,
        )

        # drill-down (row queries only): restrict to the single group `group_key`.
        # This is a filter, not an aggregate, so it must run before the grouping /
        # sorting branch and must not trigger `apply_grouping`.
        is_drill_down = self.group_by is not None and self.group_key is not None
        if self.group_by is not None and self.group_key is not None:
            query = apply_drill_down(
                query=query,
                group_by=self.group_by,
                group_key=self.group_key,
                subquery_dict=subquery_dict,
            )

        # grouping (aggregate `/groups` request): only when NOT drilling down
        if self.group_by is not None and not is_drill_down:
            query = apply_grouping(
                query=query,
                group_by=self.group_by,
                subquery_dict=subquery_dict,
            )

        # with sorting
        elif self.sorts is not None and len(self.sorts) > 0:
            query = apply_sorting(
                query=query,
                sorts=self.sorts,
                subquery_dict=subquery_dict,
            )
        # no sorting
        else:
            first_column = list(query.column_descriptions)[0]["name"]
            query = query.order_by(desc(first_column))

        # with pagination
        if page_number is not None and page_size is not None:
            query, pagination = apply_pagination(
                query=query, page_number=page_number + 1, page_size=page_size
            )
            total_results = pagination.total_results
            result_rows = query.all()
        # no pagination
        else:
            result_rows = query.all()
            total_results = len(result_rows)

        return result_rows, total_results
