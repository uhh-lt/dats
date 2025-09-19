from sqlalchemy.orm import Session

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_orm import MemoORM
from core.memo.object_handle_orm import ObjectHandleORM
from core.tag.tag_orm import TagORM
from core.user.user_orm import UserORM
from repos.db.sql_utils import aggregate_ids
from systems.search_system.column_info import AbstractColumns
from systems.search_system.filtering_operators import FilterOperator, FilterValueType
from systems.search_system.search_builder import SearchBuilder

# TODO: How to do text search?


class SentAnnoColumns(str, AbstractColumns):
    # TEXT = "SentAnno_SPAN_TEXT"
    CODE_ID = "SentAnno_CODE_ID"
    USER_ID = "SentAnno_USER_ID"
    MEMO_CONTENT = "SentAnno_MEMO_CONTENT"
    SOURCE_DOCUMENT_NAME = "SentAnno_SOURCE_SOURCE_DOCUMENT_NAME"
    TAG_ID_LIST = "SentAnno_TAG_ID_LIST"

    def get_filter_column(self, subquery_dict):
        match self:
            case SentAnnoColumns.SOURCE_DOCUMENT_NAME:
                return SourceDocumentORM.name
            case SentAnnoColumns.TAG_ID_LIST:
                return subquery_dict[SentAnnoColumns.TAG_ID_LIST.value]
            case SentAnnoColumns.CODE_ID:
                return SentenceAnnotationORM.code_id
            # case SentAnnoColumns.TEXT:
            #     return SpanTextORM.text
            case SentAnnoColumns.MEMO_CONTENT:
                return MemoORM.content
            case SentAnnoColumns.USER_ID:
                return AnnotationDocumentORM.user_id

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case SentAnnoColumns.SOURCE_DOCUMENT_NAME:
                return FilterOperator.STRING
            case SentAnnoColumns.TAG_ID_LIST:
                return FilterOperator.ID_LIST
            case SentAnnoColumns.CODE_ID:
                return FilterOperator.ID
            # case SentAnnoColumns.TEXT:
            #     return FilterOperator.STRING
            case SentAnnoColumns.MEMO_CONTENT:
                return FilterOperator.STRING
            case SentAnnoColumns.USER_ID:
                return FilterOperator.ID

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case SentAnnoColumns.SOURCE_DOCUMENT_NAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case SentAnnoColumns.TAG_ID_LIST:
                return FilterValueType.TAG_ID
            case SentAnnoColumns.CODE_ID:
                return FilterValueType.CODE_ID
            # case SentAnnoColumns.TEXT:
            #     return FilterValueType.INFER_FROM_OPERATOR
            case SentAnnoColumns.MEMO_CONTENT:
                return FilterValueType.INFER_FROM_OPERATOR
            case SentAnnoColumns.USER_ID:
                return FilterValueType.USER_ID

    def get_sort_column(self):
        match self:
            case SentAnnoColumns.SOURCE_DOCUMENT_NAME:
                return SourceDocumentORM.name
            case SentAnnoColumns.TAG_ID_LIST:
                return None
            case SentAnnoColumns.CODE_ID:
                return CodeORM.name
            # case SentAnnoColumns.TEXT:
            #     return SpanTextORM.text
            case SentAnnoColumns.MEMO_CONTENT:
                return MemoORM.content
            case SentAnnoColumns.USER_ID:
                return UserORM.last_name

    def get_label(self) -> str:
        match self:
            case SentAnnoColumns.SOURCE_DOCUMENT_NAME:
                return "Document name"
            case SentAnnoColumns.TAG_ID_LIST:
                return "Tags"
            case SentAnnoColumns.CODE_ID:
                return "Code"
            # case SentAnnoColumns.TEXT:
            #     return "Annotated text"
            case SentAnnoColumns.MEMO_CONTENT:
                return "Memo content"
            case SentAnnoColumns.USER_ID:
                return "User"

    def add_subquery_filter_statements(self, query_builder: SearchBuilder):
        match self:
            case SentAnnoColumns.TAG_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        TagORM.id,
                        label=SentAnnoColumns.TAG_ID_LIST.value,
                    )
                )
                query_builder._join_subquery(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.id
                    == SentenceAnnotationORM.annotation_document_id,
                )
                query_builder._join_subquery(
                    SourceDocumentORM,
                    SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
                )
                query_builder._join_subquery(SourceDocumentORM.tags, isouter=True)

    def add_query_filter_statements(self, query_builder: SearchBuilder):
        match self:
            case SentAnnoColumns.SOURCE_DOCUMENT_NAME:
                query_builder._join_query(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.id
                    == SentenceAnnotationORM.annotation_document_id,
                )._join_query(
                    SourceDocumentORM,
                    SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
                )
            case SentAnnoColumns.MEMO_CONTENT:
                query_builder._join_query(
                    SentenceAnnotationORM.object_handle, isouter=True
                )._join_query(
                    ObjectHandleORM.attached_memos.and_(
                        MemoORM.user_id == AnnotationDocumentORM.user_id
                    ),
                    isouter=True,
                )
            case SentAnnoColumns.USER_ID:
                query_builder._join_query(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.id
                    == SentenceAnnotationORM.annotation_document_id,
                )

    def resolve_ids(self, db: Session, ids: list[int]) -> list[str]:
        match self:
            case SentAnnoColumns.TAG_ID_LIST:
                result = (
                    db.query(TagORM)
                    .filter(
                        TagORM.id.in_(ids),
                    )
                    .all()
                )
                return [tag.name for tag in result]
            case SentAnnoColumns.CODE_ID:
                result = (
                    db.query(CodeORM)
                    .filter(
                        CodeORM.id.in_(ids),
                    )
                    .all()
                )
                return [code.name for code in result]
            case SentAnnoColumns.USER_ID:
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
        self, db: Session, project_id: int, names: list[str]
    ) -> list[int]:
        match self:
            case SentAnnoColumns.TAG_ID_LIST:
                result = (
                    db.query(TagORM)
                    .filter(
                        TagORM.project_id == project_id,
                        TagORM.name.in_(names),
                    )
                    .all()
                )
                return [tag.id for tag in result]
            case SentAnnoColumns.CODE_ID:
                result = (
                    db.query(CodeORM)
                    .filter(
                        CodeORM.project_id == project_id,
                        CodeORM.name.in_(names),
                    )
                    .all()
                )
                return [code.id for code in result]
            case SentAnnoColumns.USER_ID:
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
