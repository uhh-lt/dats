from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import cast
from sqlalchemy.types import String

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.code.code_crud import crud_code
from core.code.code_orm import CodeORM
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderType
from core.doc.folder_orm import FolderORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_dto import AttachedObjectType
from core.memo.memo_orm import MemoORM
from core.memo.object_handle_orm import ObjectHandleORM
from core.tag.tag_crud import crud_tag
from core.tag.tag_orm import TagORM
from core.user.user_crud import crud_user
from core.user.user_orm import UserORM
from repos.db.sql_utils import aggregate_ids
from systems.search_system.column_info import AbstractColumns
from systems.search_system.filtering_operators import FilterOperator, FilterValueType
from systems.search_system.grouping import GroupExpressions
from systems.search_system.search_builder import SearchBuilder


class SentAnnoColumns(str, AbstractColumns):
    CODE_ID_LIST_RECURSIVE = "SentAnno_CODE_ID_LIST_RECURSIVE"
    USER_ID = "SentAnno_USER_ID"
    MEMO_CONTENT = "SentAnno_MEMO_CONTENT"
    SOURCE_DOCUMENT_NAME = "SentAnno_SOURCE_SOURCE_DOCUMENT_NAME"
    TAG_ID_LIST_RECURSIVE = "SentAnno_TAG_ID_LIST_RECURSIVE"
    FOLDER_ID_LIST_RECURSIVE = "SentAnno_FOLDER_ID_LIST_RECURSIVE"

    def get_filter_column(self, subquery_dict):
        match self:
            case SentAnnoColumns.SOURCE_DOCUMENT_NAME:
                return SourceDocumentORM.name
            case SentAnnoColumns.TAG_ID_LIST_RECURSIVE:
                return subquery_dict[SentAnnoColumns.TAG_ID_LIST_RECURSIVE.value]
            case SentAnnoColumns.FOLDER_ID_LIST_RECURSIVE:
                return subquery_dict[SentAnnoColumns.FOLDER_ID_LIST_RECURSIVE.value]
            case SentAnnoColumns.CODE_ID_LIST_RECURSIVE:
                return subquery_dict[SentAnnoColumns.CODE_ID_LIST_RECURSIVE.value]
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
            case SentAnnoColumns.TAG_ID_LIST_RECURSIVE:
                return FilterOperator.ID_LIST_RECURSIVE
            case SentAnnoColumns.FOLDER_ID_LIST_RECURSIVE:
                return FilterOperator.ID_LIST_RECURSIVE
            case SentAnnoColumns.CODE_ID_LIST_RECURSIVE:
                return FilterOperator.ID_LIST_RECURSIVE
            case SentAnnoColumns.MEMO_CONTENT:
                return FilterOperator.STRING
            case SentAnnoColumns.USER_ID:
                return FilterOperator.ID

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case SentAnnoColumns.SOURCE_DOCUMENT_NAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case SentAnnoColumns.TAG_ID_LIST_RECURSIVE:
                return FilterValueType.TAG_ID
            case SentAnnoColumns.FOLDER_ID_LIST_RECURSIVE:
                return FilterValueType.FOLDER_ID
            case SentAnnoColumns.CODE_ID_LIST_RECURSIVE:
                return FilterValueType.CODE_ID
            case SentAnnoColumns.MEMO_CONTENT:
                return FilterValueType.INFER_FROM_OPERATOR
            case SentAnnoColumns.USER_ID:
                return FilterValueType.USER_ID

    def get_sort_column(self, subquery_dict=None):
        match self:
            case SentAnnoColumns.SOURCE_DOCUMENT_NAME:
                return SourceDocumentORM.name
            case SentAnnoColumns.TAG_ID_LIST_RECURSIVE:
                return None
            case SentAnnoColumns.FOLDER_ID_LIST_RECURSIVE:
                return None
            case SentAnnoColumns.CODE_ID_LIST_RECURSIVE:
                return CodeORM.name
            case SentAnnoColumns.MEMO_CONTENT:
                return MemoORM.content
            case SentAnnoColumns.USER_ID:
                return UserORM.last_name

    def get_label(self) -> str:
        match self:
            case SentAnnoColumns.SOURCE_DOCUMENT_NAME:
                return "Document name"
            case SentAnnoColumns.TAG_ID_LIST_RECURSIVE:
                return "Tags"
            case SentAnnoColumns.FOLDER_ID_LIST_RECURSIVE:
                return "Folder"
            case SentAnnoColumns.CODE_ID_LIST_RECURSIVE:
                return "Code"
            case SentAnnoColumns.MEMO_CONTENT:
                return "Memo content"
            case SentAnnoColumns.USER_ID:
                return "User"

    def add_subquery_filter_statements(self, query_builder: SearchBuilder):
        match self:
            case SentAnnoColumns.CODE_ID_LIST_RECURSIVE:
                # The subquery is grouped per annotation, so this aggregates to
                # [code_id] per row; recursion expands the filter value instead.
                query_builder._add_subquery_column(
                    aggregate_ids(
                        SentenceAnnotationORM.code_id,
                        label=SentAnnoColumns.CODE_ID_LIST_RECURSIVE.value,
                    )
                )
            case SentAnnoColumns.TAG_ID_LIST_RECURSIVE:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        TagORM.id,
                        label=SentAnnoColumns.TAG_ID_LIST_RECURSIVE.value,
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
            case SentAnnoColumns.FOLDER_ID_LIST_RECURSIVE:
                # folder_id → SDOC_FOLDER; SDOC_FOLDER.parent_id → NORMAL folder (what users filter on)
                query_builder._add_subquery_column(
                    aggregate_ids(
                        FolderORM.parent_id,
                        label=SentAnnoColumns.FOLDER_ID_LIST_RECURSIVE.value,
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
                query_builder._join_subquery(
                    FolderORM,
                    FolderORM.id == SourceDocumentORM.folder_id,
                    isouter=True,
                )

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
                # Memos are collaborative: match memo content regardless of who
                # authored the memo or the annotation.
                query_builder._join_query(
                    SentenceAnnotationORM.object_handle, isouter=True
                )._join_query(ObjectHandleORM.attached_memos, isouter=True)
            case SentAnnoColumns.USER_ID:
                query_builder._join_query(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.id
                    == SentenceAnnotationORM.annotation_document_id,
                )._join_query(
                    UserORM,
                    UserORM.id == AnnotationDocumentORM.user_id,
                )

    def is_groupable(self) -> bool:
        return self in {
            SentAnnoColumns.CODE_ID_LIST_RECURSIVE,
            SentAnnoColumns.USER_ID,
            SentAnnoColumns.SOURCE_DOCUMENT_NAME,
        }

    def get_group_expressions(self, subquery_dict, date_granularity):
        # Grouping runs against the outer query, which already joins CodeORM,
        # SourceDocumentORM, AnnotationDocumentORM (and UserORM for USER_ID).
        match self:
            case SentAnnoColumns.CODE_ID_LIST_RECURSIVE:
                return GroupExpressions(
                    key=cast(SentenceAnnotationORM.code_id, String),
                    label=CodeORM.name,
                    target_id=SentenceAnnotationORM.code_id,
                    target_type=AttachedObjectType.code.value,
                )
            case SentAnnoColumns.USER_ID:
                return GroupExpressions(
                    key=cast(AnnotationDocumentORM.user_id, String),
                    label=UserORM.email,
                )
            case SentAnnoColumns.SOURCE_DOCUMENT_NAME:
                return GroupExpressions(
                    key=SourceDocumentORM.name,
                    label=SourceDocumentORM.name,
                    target_id=SourceDocumentORM.id,
                    target_type=AttachedObjectType.source_document.value,
                )
            case _:
                return None

    def resolve_ids(self, db: Session, ids: list[int]) -> list[str]:
        match self:
            case SentAnnoColumns.TAG_ID_LIST_RECURSIVE:
                tags = crud_tag.read_by_ids(db, ids=ids)
                return [tag.name for tag in tags]
            case SentAnnoColumns.FOLDER_ID_LIST_RECURSIVE:
                folders = crud_folder.read_by_ids(db, ids=ids)
                return [folder.name for folder in folders]
            case SentAnnoColumns.CODE_ID_LIST_RECURSIVE:
                codes = crud_code.read_by_ids(db, ids=ids)
                return [code.name for code in codes]
            case SentAnnoColumns.USER_ID:
                users = crud_user.read_by_ids(db, ids=ids)
                return [user.email for user in users]
            case _:
                raise NotImplementedError(f"Cannot resolve ID for {self}!")

    def resolve_names(
        self, db: Session, project_id: int, names: list[str]
    ) -> list[int]:
        match self:
            case SentAnnoColumns.TAG_ID_LIST_RECURSIVE:
                result = crud_tag.read_by_names(db, project_id=project_id, names=names)
                return [tag.id for tag in result]
            case SentAnnoColumns.FOLDER_ID_LIST_RECURSIVE:
                result = crud_folder.read_by_names(
                    db,
                    project_id=project_id,
                    names=names,
                    folder_type=FolderType.NORMAL,
                )
                return [folder.id for folder in result]
            case SentAnnoColumns.CODE_ID_LIST_RECURSIVE:
                result = crud_code.read_by_names(db, project_id=project_id, names=names)
                return [code.id for code in result]
            case SentAnnoColumns.USER_ID:
                result = crud_user.read_by_emails(db, emails=names)
                return [user.id for user in result]
            case _:
                raise NotImplementedError(f"Cannot resolve name for {self}!")
