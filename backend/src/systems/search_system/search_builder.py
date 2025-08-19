from typing import TYPE_CHECKING, Any, TypeVar

from sqlalchemy import desc
from sqlalchemy.orm import Query, Session, aliased
from sqlalchemy.sql._typing import (
    _ColumnExpressionArgument,  # type: ignore
    _JoinTargetArgument,  # type: ignore
    _OnClauseArgument,  # type: ignore
)
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
from systems.search_system.pagination import apply_pagination
from systems.search_system.sorting import (
    Sort,
    apply_sorting,
    get_columns_affected_by_sorts,
)

if TYPE_CHECKING:
    from systems.search_system.abstract_column import AbstractColumns

T = TypeVar("T", bound="AbstractColumns")


class SearchBuilder:
    def __init__(self, db: Session, filter: Filter[T], sorts: list[Sort[T]]) -> None:
        self.db = db
        self.filter = filter
        self.sorts = sorts
        self.joined_subquery_tables: list[str] = []
        self.joined_query_tables: list[str] = []
        self.selected_columns: list[str] = []
        self.subquery: Query | Subquery | None = None
        self.query: Query | None = None

        affected_columns = get_columns_affected_by_filter(self.filter)
        affected_columns.update(get_columns_affected_by_sorts(self.sorts))
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
            .join(
                metadata,
                (SourceDocumentORM.id == metadata.source_document_id)
                & (metadata.project_metadata_id == project_metadata_id),
            )
            .group_by(metadata.id)
        )

    def init_subquery(self, subquery: Query) -> "SearchBuilder":
        if self.subquery is not None:
            raise ValueError("Subquery was initialized already!")

        self.subquery = subquery

        return self

    def build_subquery(self) -> Subquery:
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
        if self.query is not None:
            raise ValueError("Query was initialized already!")

        self.query = query

        return self

    def build_query(self) -> Query:
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
        if self.query is None:
            raise ValueError("Query is not initialized")

        subquery_dict = {}
        if self.subquery is not None and isinstance(self.subquery, Subquery):
            print("Using subquery")
            subquery_dict = self.subquery.c

        # filtering
        query = apply_filtering(
            query=self.query,
            filter=self.filter,
            subquery_dict=subquery_dict,
        )

        # with sorting
        if self.sorts is not None and len(self.sorts) > 0:
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
