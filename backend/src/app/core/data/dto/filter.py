from enum import Enum
from typing import List, Union

from pydantic import BaseModel
from sqlalchemy import Column, and_, or_

from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_text import SpanTextORM

# --- Operators: These define how we can compare values in filters.


class StringOperator(Enum):
    CONTAINS = "STRING_CONTAINS"
    EQUALS = "STRING_EQUALS"
    NOT_EQUALS = "STRING_NOT_EQUALS"
    STARTS_WITH = "STRING_STARTS_WITH"
    ENDS_WITH = "STRING_ENDS_WITH"

    def apply(self, column: Column, value: str):
        match self:
            case StringOperator.EQUALS:
                return column == value
            case StringOperator.NOT_EQUALS:
                return column != value
            case StringOperator.STARTS_WITH:
                return column.startswith(value)
            case StringOperator.ENDS_WITH:
                return column.endswith(value)
            case StringOperator.CONTAINS:
                return column.contains(value)


class IDOperator(Enum):
    EQUALS = "ID_EQUALS"
    NOT_EQUALS = "ID_NOT_EQUALS"

    def apply(self, column: Column, value: int):
        match self:
            case IDOperator.EQUALS:
                return column == value
            case IDOperator.NOT_EQUALS:
                return column != value


class NumberOperator(Enum):
    EQUALS = "NUMBER_EQUALS"
    NOT_EQUALS = "NUMBER_NOT_EQUALS"
    GT = "NUMBER_GT"
    LT = "NUMBER_LT"
    GTE = "NUMBER_GTE"
    LTE = "NUMBER_LTE"

    def apply(self, column: Column, value: int):
        match self:
            case NumberOperator.EQUALS:
                return column == value
            case NumberOperator.NOT_EQUALS:
                return column != value
            case NumberOperator.GT:
                return column > value
            case NumberOperator.LT:
                return column < value
            case NumberOperator.GTE:
                return column >= value
            case NumberOperator.LTE:
                return column <= value


class DBColumns(Enum):
    SPAN_TEXT = "SPAN_TEXT"

    SOURCE_DOCUMENT_ID = "SOURCE_DOCUMENT_ID"
    SOURCE_DOCUMENT_FILENAME = "SOURCE_DOCUMENT_FILENAME"

    CODE_ID = "CODE_ID"
    CODE_NAME = "CODE_NAME"

    DOCUMENT_TAG_ID = "DOCUMENT_TAG_ID"
    DOCUMENT_TAG_TITLE = "DOCUMENT_TAG_TITLE"

    MEMO_ID = "MEMO_ID"
    MEMO_CONTENT = "MEMO_CONTENT"
    MEMO_TITLE = "MEMO_TITLE"

    def get_column(self) -> Column:
        match self:
            case DBColumns.SPAN_TEXT:
                return SpanTextORM.text
            case DBColumns.SOURCE_DOCUMENT_ID:
                return SourceDocumentORM.id
            case DBColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case DBColumns.CODE_ID:
                return CodeORM.id
            case DBColumns.CODE_NAME:
                return CodeORM.name
            case DBColumns.DOCUMENT_TAG_ID:
                return DocumentTagORM.id
            case DBColumns.DOCUMENT_TAG_TITLE:
                return DocumentTagORM.title
            case DBColumns.MEMO_ID:
                return MemoORM.id
            case DBColumns.MEMO_CONTENT:
                return MemoORM.content
            case DBColumns.MEMO_TITLE:
                return MemoORM.title


class FilterExpression(BaseModel):
    column: DBColumns
    operator: Union[IDOperator, NumberOperator, StringOperator]
    value: Union[str, int]

    def get_sqlalchemy_expression(self):
        return self.operator.apply(self.column.get_column(), value=self.value)


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

    items: List[Union[FilterExpression, "Filter"]]
    logic_operator: LogicalOperator

    def get_sqlalchemy_expression(self):
        op = self.logic_operator.get_sqlalchemy_operator()
        return op(*[f.get_sqlalchemy_expression() for f in self.items])


Filter.update_forward_refs()
