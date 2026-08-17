from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import cast
from sqlalchemy.types import String

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
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
from repos.db.sql_utils import aggregate_ids
from systems.search_system.column_info import AbstractColumns
from systems.search_system.filtering_operators import FilterOperator, FilterValueType
from systems.search_system.grouping import GroupExpressions
from systems.search_system.search_builder import SearchBuilder


class BBoxColumns(str, AbstractColumns):
    CODE_ID = "BB_CODE_ID"
    MEMO_CONTENT = "BB_MEMO_CONTENT"
    SOURCE_DOCUMENT_NAME = "BB_SOURCE_SOURCE_DOCUMENT_NAME"
    TAG_ID_LIST_RECURSIVE = "BB_TAG_ID_LIST_RECURSIVE"
    FOLDER_ID_LIST_RECURSIVE = "BB_FOLDER_ID_LIST_RECURSIVE"

    def get_filter_column(self, subquery_dict):
        match self:
            case BBoxColumns.SOURCE_DOCUMENT_NAME:
                return SourceDocumentORM.name
            case BBoxColumns.TAG_ID_LIST_RECURSIVE:
                return subquery_dict[BBoxColumns.TAG_ID_LIST_RECURSIVE.value]
            case BBoxColumns.FOLDER_ID_LIST_RECURSIVE:
                return subquery_dict[BBoxColumns.FOLDER_ID_LIST_RECURSIVE.value]
            case BBoxColumns.CODE_ID:
                return BBoxAnnotationORM.code_id
            case BBoxColumns.MEMO_CONTENT:
                return MemoORM.content

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case BBoxColumns.SOURCE_DOCUMENT_NAME:
                return FilterOperator.STRING
            case BBoxColumns.TAG_ID_LIST_RECURSIVE:
                return FilterOperator.ID_LIST_RECURSIVE
            case BBoxColumns.FOLDER_ID_LIST_RECURSIVE:
                return FilterOperator.ID_LIST_RECURSIVE
            case BBoxColumns.CODE_ID:
                return FilterOperator.ID
            case BBoxColumns.MEMO_CONTENT:
                return FilterOperator.STRING

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case BBoxColumns.SOURCE_DOCUMENT_NAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case BBoxColumns.TAG_ID_LIST_RECURSIVE:
                return FilterValueType.TAG_ID
            case BBoxColumns.FOLDER_ID_LIST_RECURSIVE:
                return FilterValueType.FOLDER_ID
            case BBoxColumns.CODE_ID:
                return FilterValueType.CODE_ID
            case BBoxColumns.MEMO_CONTENT:
                return FilterValueType.INFER_FROM_OPERATOR

    def get_sort_column(self, subquery_dict=None):
        match self:
            case BBoxColumns.SOURCE_DOCUMENT_NAME:
                return SourceDocumentORM.name
            case BBoxColumns.TAG_ID_LIST_RECURSIVE:
                return None
            case BBoxColumns.FOLDER_ID_LIST_RECURSIVE:
                return None
            case BBoxColumns.CODE_ID:
                return CodeORM.name
            case BBoxColumns.MEMO_CONTENT:
                return MemoORM.content

    def get_label(self) -> str:
        match self:
            case BBoxColumns.SOURCE_DOCUMENT_NAME:
                return "Document name"
            case BBoxColumns.TAG_ID_LIST_RECURSIVE:
                return "Tags"
            case BBoxColumns.FOLDER_ID_LIST_RECURSIVE:
                return "Folder"
            case BBoxColumns.CODE_ID:
                return "Code"
            case BBoxColumns.MEMO_CONTENT:
                return "Memo content"

    def add_subquery_filter_statements(self, query_builder: SearchBuilder):
        match self:
            case BBoxColumns.TAG_ID_LIST_RECURSIVE:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        TagORM.id,
                        label=BBoxColumns.TAG_ID_LIST_RECURSIVE.value,
                    )
                )
                query_builder._join_subquery(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.id
                    == BBoxAnnotationORM.annotation_document_id,
                )
                query_builder._join_subquery(
                    SourceDocumentORM,
                    SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
                )
                query_builder._join_subquery(SourceDocumentORM.tags, isouter=True)
            case BBoxColumns.FOLDER_ID_LIST_RECURSIVE:
                # folder_id → SDOC_FOLDER; SDOC_FOLDER.parent_id → NORMAL folder (what users filter on)
                query_builder._add_subquery_column(
                    aggregate_ids(
                        FolderORM.parent_id,
                        label=BBoxColumns.FOLDER_ID_LIST_RECURSIVE.value,
                    )
                )
                query_builder._join_subquery(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.id
                    == BBoxAnnotationORM.annotation_document_id,
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
            case BBoxColumns.SOURCE_DOCUMENT_NAME:
                query_builder._join_query(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.id
                    == BBoxAnnotationORM.annotation_document_id,
                )._join_query(
                    SourceDocumentORM,
                    SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
                )
            case BBoxColumns.MEMO_CONTENT:
                query_builder._join_query(
                    BBoxAnnotationORM.object_handle, isouter=True
                )._join_query(
                    ObjectHandleORM.attached_memos.and_(
                        MemoORM.user_id == AnnotationDocumentORM.user_id
                    ),
                    isouter=True,
                )

    def is_groupable(self) -> bool:
        return self in {
            BBoxColumns.CODE_ID,
            BBoxColumns.SOURCE_DOCUMENT_NAME,
        }

    def get_group_expressions(self, subquery_dict, date_granularity):
        # Grouping runs against the outer query, which already joins CodeORM and
        # SourceDocumentORM.
        match self:
            case BBoxColumns.CODE_ID:
                return GroupExpressions(
                    key=cast(BBoxAnnotationORM.code_id, String),
                    label=CodeORM.name,
                    target_id=BBoxAnnotationORM.code_id,
                    target_type=AttachedObjectType.code.value,
                )
            case BBoxColumns.SOURCE_DOCUMENT_NAME:
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
            case BBoxColumns.TAG_ID_LIST_RECURSIVE:
                tags = crud_tag.read_by_ids(db, ids=ids)
                return [tag.name for tag in tags]
            case BBoxColumns.FOLDER_ID_LIST_RECURSIVE:
                folders = crud_folder.read_by_ids(db, ids=ids)
                return [folder.name for folder in folders]
            case BBoxColumns.CODE_ID:
                codes = crud_code.read_by_ids(db, ids=ids)
                return [code.name for code in codes]
            case _:
                raise NotImplementedError(f"Cannot resolve ID for {self}!")

    def resolve_names(
        self, db: Session, project_id: int, names: list[str]
    ) -> list[int]:
        match self:
            case BBoxColumns.TAG_ID_LIST_RECURSIVE:
                result = crud_tag.read_by_names(db, project_id=project_id, names=names)
                return [tag.id for tag in result]
            case BBoxColumns.FOLDER_ID_LIST_RECURSIVE:
                result = crud_folder.read_by_names(
                    db,
                    project_id=project_id,
                    names=names,
                    folder_type=FolderType.NORMAL,
                )
                return [folder.id for folder in result]
            case BBoxColumns.CODE_ID:
                result = crud_code.read_by_names(db, project_id=project_id, names=names)
                return [code.id for code in result]
            case _:
                raise NotImplementedError(f"Cannot resolve name for {self}!")
