from abc import ABC
from enum import Enum
from re import U
from typing import List, Union
from typing_extensions import TypeAliasType
from pydantic import BaseModel, Field
from sqlalchemy import Column, and_, column, or_
from sqlalchemy.orm import Query
from app.core.data.orm.code import CodeORM

from app.core.data.orm.project import ProjectORM
from app.core.data.orm.user import UserORM


class ProjectColumn(str, Enum):
    id = "id"

    def get_orm_obj(self):
        match self:
            case ProjectColumn.id:
                return ProjectORM.id


class CodeColumn(str, Enum):
    id = "id"

    def get_orm_obj(self):
        match self:
            case CodeColumn.id:
                return CodeORM.id


class FieldOperator(str, Enum):
    equals = "equals"

    def apply(self, a, b):
        match self:
            case FieldOperator.equals:
                return a == b


class LogicalOperator(str, Enum):
    or_ = "or"
    and_ = "and"

    def get_sqlalchemy_operator(self):
        match self:
            case LogicalOperator.or_:
                return or_
            case LogicalOperator.and_:
                return and_


class ColumnExpression(BaseModel):
    column: Union[ProjectColumn, CodeColumn] = Field(description="Column to filter on")
    operator: FieldOperator = Field(description="Operator to use")
    value: str = Field(description="Value to compare against")

    def get_sqlalchemy_expression(self):
        return self.operator.apply(self.column.get_orm_obj(), self.value)


class Filter(BaseModel):
    items: "List[Union[ColumnExpression, Filter]]"
    operator: LogicalOperator

    def get_sqlalchemy_expression(self):
        op = self.operator.get_sqlalchemy_operator()
        return op(*[f.get_sqlalchemy_expression() for f in self.items])


Filter.update_forward_refs()

test_filter = Filter(
    items=[
        ColumnExpression(
            column=ProjectColumn.id, operator=FieldOperator.equals, value="1"
        ),
        ColumnExpression(
            column=CodeColumn.id, operator=FieldOperator.equals, value="2"
        ),
        Filter(
            items=[
                ColumnExpression(
                    column=ProjectColumn.id, operator=FieldOperator.equals, value="3"
                ),
                ColumnExpression(
                    column=ProjectColumn.id, operator=FieldOperator.equals, value="4"
                ),
            ],
            operator=LogicalOperator.or_,
        ),
    ],
    operator=LogicalOperator.and_,
)
print(test_filter.get_sqlalchemy_expression())
