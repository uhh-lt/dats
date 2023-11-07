from enum import Enum
from typing import List, Optional, Union
from app.core.data.meta_type import MetaType
from typing import List, Union

from pydantic import BaseModel
from sqlalchemy import Column, and_, or_

from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_fact import SourceDocumentFactORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
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


class ArrayOperator(Enum):
    CONTAINS = "ARRAY_CONTAINS"

    def apply(self, column, value: str):
        match self:
            case ArrayOperator.CONTAINS:
                return column.contains([int(value)])


class FilterExpression(BaseModel):
    column: DBColumns
    metadata_key: Optional[str]
    metadata_type: Optional[MetaType]  # only used for METADATA filters
    operator: Union[IDOperator, NumberOperator, StringOperator, ArrayOperator]
    value: Union[str, int]

    # todo: eigentlich müsste project_metadata_id mitgesendet werden
    # dann muss metadata_key und metadata_type nicht übermittelt werden
    # stattdessen müssen diese infos vor der filterung von der DB geholt werden

    def get_sqlalchemy_expression(self, subquery_dict=None):
        if (
            self.column == DBColumns.METADATA
            and self.metadata_key is not None
            and self.metadata_type is not None
        ):
            return SourceDocumentORM.facts.any(
                and_(
                    SourceDocumentFactORM.key == self.metadata_key,
                    # SourceDocumentFactORM.value == self.value,
                    self.operator.apply(
                        self.metadata_type.get_metadata_column(), value=self.value
                    ),
                )
            )

        else:
            return self.operator.apply(
                self.column.get_column(subquery_dict), value=self.value
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


class Filter(BaseModel):
    """A tree of column expressions for filtering on many database columns using various
    comparisons."""

    items: List[Union[FilterExpression, "Filter"]]
    logic_operator: LogicalOperator

    def get_sqlalchemy_expression(self, subquery_dict=None):
        op = self.logic_operator.get_sqlalchemy_operator()
        return op(*[f.get_sqlalchemy_expression(subquery_dict) for f in self.items])


Filter.model_rebuild()
