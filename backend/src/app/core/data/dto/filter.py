from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel
from sqlalchemy import Column, and_, or_
from sqlalchemy.orm import Session

from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_data import SourceDocumentDataORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.orm.user import UserORM


class AggregatedColumn(str, Enum):
    DOCUMENT_TAG_IDS_LIST = "tag_ids"
    CODE_IDS_LIST = "code_ids"
    USER_IDS_LIST = "user_ids"
    SPAN_ANNOTATION_IDS_LIST = "span_annotation_ids"
    SPAN_ANNOTATIONS = "span_annotation_tuples"


# I believe it is important that key and value are identical!
class DBColumns(Enum):
    SPAN_TEXT = "SPAN_TEXT"

    SOURCE_DOCUMENT_ID = "SOURCE_DOCUMENT_ID"
    SOURCE_DOCUMENT_FILENAME = "SOURCE_DOCUMENT_FILENAME"
    SOURCE_DOCUMENT_CONTENT = "SOURCE_DOCUMENT_CONTENT"

    METADATA = "METADATA"

    CODE_ID = "CODE_ID"
    CODE_ID_LIST = "CODE_ID_LIST"
    CODE_NAME = "CODE_NAME"

    DOCUMENT_TAG_ID = "DOCUMENT_TAG_ID"
    DOCUMENT_TAG_ID_LIST = "DOCUMENT_TAG_ID_LIST"
    DOCUMENT_TAG_TITLE = "DOCUMENT_TAG_TITLE"

    MEMO_ID = "MEMO_ID"
    MEMO_CONTENT = "MEMO_CONTENT"
    MEMO_TITLE = "MEMO_TITLE"

    USER_ID = "USER_ID"
    USER_ID_LIST = "USER_ID_LIST"

    SPAN_ANNOTATIONS = "SPAN_ANNOTATIONS"
    SPAN_ANNOTATION_ID = "SPAN_ANNOTATION_ID"
    SPAN_ANNOTATION_ID_LIST = "SPAN_ANNOTATION_ID_LIST"

    def get_column(self, subquery_dict=None, metadata_key=None) -> Column:
        match self:
            case DBColumns.SPAN_TEXT:
                return SpanTextORM.text
            case DBColumns.SOURCE_DOCUMENT_ID:
                return SourceDocumentORM.id
            case DBColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case DBColumns.SOURCE_DOCUMENT_CONTENT:
                return SourceDocumentDataORM.content
            case DBColumns.CODE_ID:
                return CodeORM.id
            case DBColumns.CODE_ID_LIST:
                return subquery_dict[AggregatedColumn.CODE_IDS_LIST]
            case DBColumns.CODE_NAME:
                return CodeORM.name
            case DBColumns.DOCUMENT_TAG_ID:
                return DocumentTagORM.id
            case DBColumns.DOCUMENT_TAG_ID_LIST:
                return subquery_dict[AggregatedColumn.DOCUMENT_TAG_IDS_LIST]
            case DBColumns.DOCUMENT_TAG_TITLE:
                return DocumentTagORM.title
            case DBColumns.MEMO_ID:
                return MemoORM.id
            case DBColumns.MEMO_CONTENT:
                return MemoORM.content
            case DBColumns.MEMO_TITLE:
                return MemoORM.title
            case DBColumns.METADATA:
                return SourceDocumentMetadataORM.value
            case DBColumns.USER_ID:
                return UserORM.id
            case DBColumns.USER_ID_LIST:
                return subquery_dict[AggregatedColumn.USER_IDS_LIST]
            case DBColumns.SPAN_ANNOTATION_ID:
                return SpanAnnotationORM.id
            case DBColumns.SPAN_ANNOTATION_ID_LIST:
                return subquery_dict[AggregatedColumn.SPAN_ANNOTATION_IDS_LIST]
            case DBColumns.SPAN_ANNOTATIONS:
                return subquery_dict[AggregatedColumn.SPAN_ANNOTATIONS]


# --- Operators: These define how we can compare values in filters.


class BooleanOperator(Enum):
    EQUALS = "BOOLEAN_EQUALS"

    def apply(self, column: Column, value: bool):
        match self:
            case BooleanOperator.EQUALS:
                return column == value


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


class IDListOperator(Enum):
    CONTAINS = "ID_LIST_CONTAINS"

    def apply(self, column, value: str):
        match self:
            case IDListOperator.CONTAINS:
                return column.contains([int(value)])


class ListOperator(Enum):
    CONTAINS = "LIST_CONTAINS"

    def apply(self, column, value: Union[List[List[str]], List[str]]):
        match self:
            case ListOperator.CONTAINS:
                return column.contains([value])


class DateOperator(Enum):
    EQUALS = "DATE_EQUALS"
    GT = "DATE_GT"
    LT = "DATE_LT"
    GTE = "DATE_GTE"
    LTE = "DATE_LTE"

    def apply(self, column: Column, value: str):
        match self:
            case DateOperator.EQUALS:
                return column == value
            case DateOperator.GT:
                return column > value
            case DateOperator.LT:
                return column < value
            case DateOperator.GTE:
                return column >= value
            case DateOperator.LTE:
                return column <= value


class FilterExpression(BaseModel):
    column: DBColumns
    project_metadata_id: Optional[int]  # only used for DBColums.METADATA
    operator: Union[
        IDOperator,
        NumberOperator,
        StringOperator,
        IDListOperator,
        ListOperator,
        DateOperator,
        BooleanOperator,
    ]
    value: Union[str, int, bool, List[str], List[List[str]]]

    # todo: eigentlich müsste project_metadata_id mitgesendet werden
    # dann muss metadata_key und metadata_type nicht übermittelt werden
    # stattdessen müssen diese infos vor der filterung von der DB geholt werden

    def get_sqlalchemy_expression(self, db: Session, subquery_dict=None):
        if self.column == DBColumns.METADATA and self.project_metadata_id is not None:
            project_metadata = ProjectMetadataRead.model_validate(
                crud_project_meta.read(db=db, id=self.project_metadata_id)
            )
            metadata_value_column = project_metadata.metatype.get_metadata_column()

            return SourceDocumentORM.metadata_.any(
                and_(
                    SourceDocumentMetadataORM.project_metadata_id
                    == self.project_metadata_id,
                    self.operator.apply(metadata_value_column, value=self.value),
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

    def get_sqlalchemy_expression(self, db: Session, subquery_dict=None):
        op = self.logic_operator.get_sqlalchemy_operator()
        return op(*[f.get_sqlalchemy_expression(db, subquery_dict) for f in self.items])


Filter.model_rebuild()
