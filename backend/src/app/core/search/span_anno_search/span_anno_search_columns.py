from typing import List

from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.orm.user import UserORM
from app.core.db.sql_utils import aggregate_ids
from app.core.search.column_info import AbstractColumns
from app.core.search.filtering_operators import FilterOperator, FilterValueType
from app.core.search.search_builder import SearchBuilder
from sqlalchemy.orm import Session


class SpanColumns(str, AbstractColumns):
    SPAN_TEXT = "SP_SPAN_TEXT"
    CODE_ID = "SP_CODE_ID"
    USER_ID = "SP_USER_ID"
    MEMO_CONTENT = "SP_MEMO_CONTENT"
    SOURCE_DOCUMENT_FILENAME = "SP_SOURCE_SOURCE_DOCUMENT_FILENAME"
    DOCUMENT_TAG_ID_LIST = "SP_DOCUMENT_DOCUMENT_TAG_ID_LIST"

    def get_filter_column(self, subquery_dict):
        match self:
            case SpanColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case SpanColumns.DOCUMENT_TAG_ID_LIST:
                return subquery_dict[SpanColumns.DOCUMENT_TAG_ID_LIST.value]
            case SpanColumns.CODE_ID:
                return SpanAnnotationORM.code_id
            case SpanColumns.SPAN_TEXT:
                return SpanTextORM.text
            case SpanColumns.MEMO_CONTENT:
                return MemoORM.content
            case SpanColumns.USER_ID:
                return AnnotationDocumentORM.user_id

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case SpanColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterOperator.STRING
            case SpanColumns.DOCUMENT_TAG_ID_LIST:
                return FilterOperator.ID_LIST
            case SpanColumns.CODE_ID:
                return FilterOperator.ID
            case SpanColumns.SPAN_TEXT:
                return FilterOperator.STRING
            case SpanColumns.MEMO_CONTENT:
                return FilterOperator.STRING
            case SpanColumns.USER_ID:
                return FilterOperator.ID

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case SpanColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case SpanColumns.DOCUMENT_TAG_ID_LIST:
                return FilterValueType.TAG_ID
            case SpanColumns.CODE_ID:
                return FilterValueType.CODE_ID
            case SpanColumns.SPAN_TEXT:
                return FilterValueType.INFER_FROM_OPERATOR
            case SpanColumns.MEMO_CONTENT:
                return FilterValueType.INFER_FROM_OPERATOR
            case SpanColumns.USER_ID:
                return FilterValueType.USER_ID

    def get_sort_column(self):
        match self:
            case SpanColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case SpanColumns.DOCUMENT_TAG_ID_LIST:
                return None
            case SpanColumns.CODE_ID:
                return CodeORM.name
            case SpanColumns.SPAN_TEXT:
                return SpanTextORM.text
            case SpanColumns.MEMO_CONTENT:
                return MemoORM.content
            case SpanColumns.USER_ID:
                return UserORM.last_name

    def get_label(self) -> str:
        match self:
            case SpanColumns.SOURCE_DOCUMENT_FILENAME:
                return "Document name"
            case SpanColumns.DOCUMENT_TAG_ID_LIST:
                return "Tags"
            case SpanColumns.CODE_ID:
                return "Code"
            case SpanColumns.SPAN_TEXT:
                return "Annotated text"
            case SpanColumns.MEMO_CONTENT:
                return "Memo content"
            case SpanColumns.USER_ID:
                return "User"

    def add_subquery_filter_statements(self, query_builder: SearchBuilder):
        match self:
            case SpanColumns.DOCUMENT_TAG_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        DocumentTagORM.id,
                        label=SpanColumns.DOCUMENT_TAG_ID_LIST.value,
                    )
                )
                query_builder._join_subquery(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.id
                    == SpanAnnotationORM.annotation_document_id,
                )
                query_builder._join_subquery(
                    SourceDocumentORM,
                    SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
                )
                query_builder._join_subquery(
                    SourceDocumentORM.document_tags, isouter=True
                )

    def add_query_filter_statements(self, query_builder: SearchBuilder):
        match self:
            case SpanColumns.SOURCE_DOCUMENT_FILENAME:
                query_builder._join_query(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.id
                    == SpanAnnotationORM.annotation_document_id,
                )._join_query(
                    SourceDocumentORM,
                    SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
                )
            case SpanColumns.SPAN_TEXT:
                query_builder._join_query(
                    SpanTextORM,
                    SpanTextORM.id == SpanAnnotationORM.span_text_id,
                )
            case SpanColumns.MEMO_CONTENT:
                query_builder._join_query(
                    SpanAnnotationORM.object_handle, isouter=True
                )._join_query(
                    ObjectHandleORM.attached_memos.and_(
                        MemoORM.user_id == AnnotationDocumentORM.user_id
                    ),
                    isouter=True,
                )
            case SpanColumns.USER_ID:
                query_builder._join_query(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.id
                    == SpanAnnotationORM.annotation_document_id,
                )

    def resolve_ids(self, db: Session, ids: List[int]) -> List[str]:
        match self:
            case SpanColumns.DOCUMENT_TAG_ID_LIST:
                result = (
                    db.query(DocumentTagORM)
                    .filter(
                        DocumentTagORM.id.in_(ids),
                    )
                    .all()
                )
                return [tag.name for tag in result]
            case SpanColumns.CODE_ID:
                result = (
                    db.query(CodeORM)
                    .filter(
                        CodeORM.id.in_(ids),
                    )
                    .all()
                )
                return [code.name for code in result]
            case SpanColumns.USER_ID:
                result = (
                    db.query(UserORM)
                    .filter(
                        UserORM.id.in_(ids),
                    )
                    .all()
                )
                return [user.email for user in result]
            case _:
                raise NotImplementedError(f"Cannot resolve ID for {self}!")

    def resolve_names(
        self, db: Session, project_id: int, names: List[str]
    ) -> List[int]:
        match self:
            case SpanColumns.DOCUMENT_TAG_ID_LIST:
                result = (
                    db.query(DocumentTagORM)
                    .filter(
                        DocumentTagORM.project_id == project_id,
                        DocumentTagORM.name.in_(names),
                    )
                    .all()
                )
                return [tag.id for tag in result]
            case SpanColumns.CODE_ID:
                result = (
                    db.query(CodeORM)
                    .filter(
                        CodeORM.project_id == project_id,
                        CodeORM.name.in_(names),
                    )
                    .all()
                )
                return [code.id for code in result]
            case SpanColumns.USER_ID:
                result = (
                    db.query(UserORM)
                    .filter(
                        UserORM.email.in_(names),
                    )
                    .all()
                )
                return [user.id for user in result]
            case _:
                raise NotImplementedError(f"Cannot resolve name for {self}!")
