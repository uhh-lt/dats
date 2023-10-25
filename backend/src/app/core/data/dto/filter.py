import abc
from enum import Enum
from typing import List, Literal, Union

from app.core.data.orm.annotation_document import AnnotationDocumentORM
from pydantic import BaseModel
from sqlalchemy import Column, and_, or_

# --- Operators: These define how we can compare values in filters.


class BaseOperator(abc.ABC, BaseModel):
    @abc.abstractmethod
    def apply(self, column: Column):
        pass


class IdEquals(BaseOperator):
    discriminator: Literal["id_equals"]
    value: int

    def apply(self, column: Column):
        return column == self.value


class IdIsOneOf(BaseOperator):
    discriminator: Literal["id_is_one_of"]
    value: List[int]

    def apply(self, column: Column):
        return column.in_(self.value)


# --- Column Expressions: These define which operators can be used for which column
# types.


class ColumnExpression(BaseModel, abc.ABC):
    operator: BaseOperator

    @staticmethod
    @abc.abstractmethod
    def get_column() -> Column:
        pass

    def get_sqlalchemy_expression(self):
        return self.operator.apply(self.get_column())


class IdColumnExpression(ColumnExpression):
    operator: Union[IdEquals, IdIsOneOf]


# --- Column-specific expression definitions: these define which specific columns
# can be filtered on.


class AnnotationDocumentOwnerExpression(IdColumnExpression):
    @staticmethod
    def get_column():
        return AnnotationDocumentORM.user_id


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


class Filter(BaseModel):
    """A tree of column expressions for filtering on many database columns using various
    comparisons."""

    items: List["Filter"]
    logic_operator: LogicalOperator

    def get_sqlalchemy_expression(self):
        op = self.logic_operator.get_sqlalchemy_operator()
        return op(*[f.get_sqlalchemy_expression() for f in self.items])


Filter.update_forward_refs()
