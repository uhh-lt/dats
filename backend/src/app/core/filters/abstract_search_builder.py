from typing import Any, List, Optional, Tuple, TypeVar, Union

from sqlalchemy.orm import Query, Session, aliased
from sqlalchemy.sql._typing import (
    _ColumnExpressionArgument,
    _JoinTargetArgument,
    _OnClauseArgument,
)
from sqlalchemy.sql.selectable import Subquery

from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.meta_type import MetaType
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.filters.abstract_column import AbstractColumns
from app.core.filters.filtering import (
    Filter,
    apply_filtering,
    get_columns_affected_by_filter,
)
from app.core.filters.pagination import apply_pagination
from app.core.filters.sorting import Sort, apply_sorting, get_columns_affected_by_sorts

T = TypeVar("T", bound=AbstractColumns)


class AbstractSearchBuilder:
    def __init__(
        self, db: Session, project_id: int, filter: Filter[T], sorts: List[Sort[T]]
    ) -> None:
        self.db = db
        self.project_id = project_id
        self.filter = filter
        self.sorts = sorts
        self.joined_tables: List[str] = []
        self.selected_columns: List[str] = []
        self.subquery: Optional[Union[Query, Subquery]] = None

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

    def _join_subquery(
        self,
        target: _JoinTargetArgument,
        onclause: _OnClauseArgument | None = None,
        *,
        isouter: bool = False,
        full: bool = False,
    ):
        if self.subquery is None:
            raise ValueError("Subquery is not initialized!")

        if isinstance(self.subquery, Subquery):
            raise ValueError("Subquery is already built!")

        # make sure that this was not joined before
        str_repr = str(target) + str(onclause) + str(isouter) + str(full)
        if str_repr in self.joined_tables:
            return

        self.joined_tables.append(str_repr)
        self.subquery = self.subquery.join(
            target,
            onclause=onclause,
            isouter=isouter,
            full=full,
        )

    def _add_subquery_metadata_filter_statements(self, project_metadata_id: int):
        if self.subquery is None:
            raise ValueError("Subquery is not initialized!")

        if isinstance(self.subquery, Subquery):
            raise ValueError("Subquery is already built!")

        # select the correct value column based on the metadata type
        project_metadata = ProjectMetadataRead.model_validate(
            crud_project_meta.read(db=self.db, id=project_metadata_id)
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

    def _add_entity_filter_statements(self, column: AbstractColumns):
        raise NotImplementedError()

    def build_subquery(self, subquery: Query) -> Subquery:
        if self.subquery is not None:
            raise ValueError("Subquery was built already!")

        self.subquery = subquery

        affected_columns = get_columns_affected_by_filter(self.filter)
        affected_columns.update(get_columns_affected_by_sorts(self.sorts))

        for column in affected_columns:
            if isinstance(column, int):
                self._add_subquery_metadata_filter_statements(column)
            else:
                self._add_entity_filter_statements(column)

        self.subquery = self.subquery.subquery()
        return self.subquery

    def execute_query(
        self, query: Query, page_number: Optional[int], page_size: Optional[int]
    ) -> Tuple[list, int]:
        # query has to be joined with the subquery

        if self.subquery is None:
            raise ValueError("Subquery is not initialized")

        if not isinstance(self.subquery, Subquery):
            raise ValueError("Subquery has to be built first")

        # filtering
        query = apply_filtering(
            query=query, filter=self.filter, subquery_dict=self.subquery.c
        )

        # with sorting
        if self.sorts is not None and len(self.sorts) > 0:
            query = apply_sorting(
                query=query, sorts=self.sorts, subquery_dict=self.subquery.c
            )
        # no sorting
        else:
            query = query.order_by(SourceDocumentORM.id.desc())

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
