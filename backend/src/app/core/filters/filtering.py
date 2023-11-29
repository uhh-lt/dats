from enum import Enum
from typing import Generic, List, TypeVar, Union

from pydantic.generics import GenericModel
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


class FilterExpression(GenericModel, Generic[T]):
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
    value: Union[bool, str, int, List[str], List[List[str]]]

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


class Filter(GenericModel, Generic[T]):
    """A tree of column expressions for filtering on many database columns using various
    comparisons."""

    items: List[Union[FilterExpression[T], "Filter[T]"]]
    logic_operator: LogicalOperator

    def get_sqlalchemy_expression(self, **kwargs):
        op = self.logic_operator.get_sqlalchemy_operator()
        return op(*[f.get_sqlalchemy_expression(**kwargs) for f in self.items])


Filter.update_forward_refs()


def apply_filtering(query, filter: Filter, **kwargs):
    return query.filter(filter.get_sqlalchemy_expression(**kwargs))
