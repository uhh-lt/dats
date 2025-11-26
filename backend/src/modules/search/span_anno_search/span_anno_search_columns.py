from sqlalchemy.orm import Session

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_text_orm import SpanTextORM
from core.code.code_crud import crud_code
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_orm import MemoORM
from core.memo.object_handle_orm import ObjectHandleORM
from core.tag.tag_crud import crud_tag
from core.tag.tag_orm import TagORM
from core.user.user_crud import crud_user
from core.user.user_orm import UserORM
from repos.db.sql_utils import aggregate_ids
from systems.search_system.column_info import AbstractColumns
from systems.search_system.filtering_operators import FilterOperator, FilterValueType
from systems.search_system.search_builder import SearchBuilder


class SpanColumns(str, AbstractColumns):
    SPAN_TEXT = "SP_SPAN_TEXT"
    CODE_ID = "SP_CODE_ID"
    USER_ID = "SP_USER_ID"
    MEMO_CONTENT = "SP_MEMO_CONTENT"
    SOURCE_DOCUMENT_NAME = "SP_SOURCE_SOURCE_DOCUMENT_NAME"
    TAG_ID_LIST = "SP_TAG_ID_LIST"

    def get_filter_column(self, subquery_dict):
        match self:
            case SpanColumns.SOURCE_DOCUMENT_NAME:
                return SourceDocumentORM.name
            case SpanColumns.TAG_ID_LIST:
                return subquery_dict[SpanColumns.TAG_ID_LIST.value]
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
            case SpanColumns.SOURCE_DOCUMENT_NAME:
                return FilterOperator.STRING
            case SpanColumns.TAG_ID_LIST:
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
            case SpanColumns.SOURCE_DOCUMENT_NAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case SpanColumns.TAG_ID_LIST:
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
            case SpanColumns.SOURCE_DOCUMENT_NAME:
                return SourceDocumentORM.name
            case SpanColumns.TAG_ID_LIST:
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
            case SpanColumns.SOURCE_DOCUMENT_NAME:
                return "Document name"
            case SpanColumns.TAG_ID_LIST:
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
            case SpanColumns.TAG_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        TagORM.id,
                        label=SpanColumns.TAG_ID_LIST.value,
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
                query_builder._join_subquery(SourceDocumentORM.tags, isouter=True)

    def add_query_filter_statements(self, query_builder: SearchBuilder):
        match self:
            case SpanColumns.SOURCE_DOCUMENT_NAME:
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

    def resolve_ids(self, db: Session, ids: list[int]) -> list[str]:
        match self:
            case SpanColumns.TAG_ID_LIST:
                tags = crud_tag.read_by_ids(db, ids=ids)
                return [tag.name for tag in tags]
            case SpanColumns.CODE_ID:
                codes = crud_code.read_by_ids(db, ids=ids)
                return [code.name for code in codes]
            case SpanColumns.USER_ID:
                users = crud_user.read_by_ids(db, ids=ids)
                return [user.email for user in users]
            case _:
                raise NotImplementedError(f"Cannot resolve ID for {self}!")

    def resolve_names(
        self, db: Session, project_id: int, names: list[str]
    ) -> list[int]:
        match self:
            case SpanColumns.TAG_ID_LIST:
                result = crud_tag.read_by_names(db, project_id=project_id, names=names)
                return [tag.id for tag in result]
            case SpanColumns.CODE_ID:
                result = crud_code.read_by_names(db, project_id=project_id, names=names)
                return [code.id for code in result]
            case SpanColumns.USER_ID:
                result = crud_user.read_by_emails(db, emails=names)
                return [user.id for user in result]
            case _:
                raise NotImplementedError(f"Cannot resolve name for {self}!")
