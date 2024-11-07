from enum import Enum
from typing import Generic, List, Set, TypeVar, Union

from pydantic import BaseModel
from sqlalchemy import and_, or_

from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.filters.columns import AbstractColumns
from app.core.filters.filtering_operators import (
    BooleanOperator,
    DateOperator,
    IDListOperator,
    IDOperator,
    ListOperator,
    NumberOperator,
    StringOperator,
)
from app.core.filters.types import FilterValue


class LogicalOperator(str, Enum):
    """This tells our filter how to combine multiple column expressions."""

    or_ = "or"
    and_ = "and"

    def get_sqlalchemy_operator(self):
        match self:
            case LogicalOperator.or_:
                return or_
            case LogicalOperator.and_:
                return and_


T = TypeVar("T", bound=AbstractColumns)


class FilterExpression(BaseModel, Generic[T]):
    id: str
    column: Union[T, int]
    operator: Union[
        IDOperator,
        NumberOperator,
        StringOperator,
        IDListOperator,
        ListOperator,
        DateOperator,
        BooleanOperator,
    ]
    value: FilterValue

    def get_sqlalchemy_expression(self, **kwargs):
        if isinstance(self.column, int):
            if "db" not in kwargs:
                raise ValueError(
                    "db (Session object) must be passed as a keyword argument if query supports metadata filtering"
                )
            db = kwargs["db"]

            # this is a project metadata expression!
            project_metadata = ProjectMetadataRead.model_validate(
                crud_project_meta.read(db=db, id=self.column)
            )
            metadata_value_column = project_metadata.metatype.get_metadata_column()

            return SourceDocumentORM.metadata_.any(
                and_(
                    SourceDocumentMetadataORM.project_metadata_id == self.column,
                    self.operator.apply(metadata_value_column, value=self.value),
                )
            )

        else:
            return self.operator.apply(
                self.column.get_filter_column(**kwargs), value=self.value
            )


class Filter(BaseModel, Generic[T]):
    """A tree of column expressions for filtering on many database columns using various
    comparisons."""

    id: str
    items: List[Union[FilterExpression[T], "Filter[T]"]]
    logic_operator: LogicalOperator

    def get_sqlalchemy_expression(self, **kwargs):
        op = self.logic_operator.get_sqlalchemy_operator()
        return op(*[f.get_sqlalchemy_expression(**kwargs) for f in self.items])


Filter.model_rebuild()


def apply_filtering(query, filter: Filter, **kwargs):
    return query.filter(filter.get_sqlalchemy_expression(**kwargs))


def get_affected_columns(filter: Filter[T]) -> Set[Union[T, int]]:
    columns: Set[Union[T, int]] = set()
    for item in filter.items:
        if isinstance(item, FilterExpression):
            columns.add(item.column)
        else:
            columns.update(get_affected_columns(item))
    return columns


def get_additional_selects(filter: Filter[T]):
    columns = get_affected_columns(filter)
    selects = []
    for c in columns:
        # metadata columns never need to be selected
        if isinstance(c, int):
            continue
        new_select = c.get_select()
        if new_select is not None:
            selects.append(new_select)
    return selects


def apply_joins(query, filter: Filter, join_metadata: bool):
    columns = get_affected_columns(filter)

    joins = []
    tablenames = []
    for c in columns:
        # metadata columns may require a join
        if isinstance(c, int):
            new_joins = [SourceDocumentORM.metadata_] if join_metadata else []
        else:
            new_joins = c.get_joins()
        for join in new_joins:
            tablename = str(join)
            if tablename not in tablenames:
                joins.append(join)
                tablenames.append(tablename)

    print("joins", joins)
    for join in joins:
        query = query.join(join)

    return query
