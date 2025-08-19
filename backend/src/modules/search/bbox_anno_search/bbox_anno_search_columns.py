from sqlalchemy.orm import Session

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_orm import MemoORM
from core.memo.object_handle_orm import ObjectHandleORM
from core.tag.tag_orm import TagORM
from repos.db.sql_utils import aggregate_ids
from systems.search_system.column_info import AbstractColumns
from systems.search_system.filtering_operators import FilterOperator, FilterValueType
from systems.search_system.search_builder import SearchBuilder


class BBoxColumns(str, AbstractColumns):
    CODE_ID = "BB_CODE_ID"
    MEMO_CONTENT = "BB_MEMO_CONTENT"
    SOURCE_DOCUMENT_FILENAME = "BB_SOURCE_SOURCE_DOCUMENT_FILENAME"
    TAG_ID_LIST = "BB_TAG_ID_LIST"

    def get_filter_column(self, subquery_dict):
        match self:
            case BBoxColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case BBoxColumns.TAG_ID_LIST:
                return subquery_dict[BBoxColumns.TAG_ID_LIST.value]
            case BBoxColumns.CODE_ID:
                return BBoxAnnotationORM.code_id
            case BBoxColumns.MEMO_CONTENT:
                return MemoORM.content

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case BBoxColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterOperator.STRING
            case BBoxColumns.TAG_ID_LIST:
                return FilterOperator.ID_LIST
            case BBoxColumns.CODE_ID:
                return FilterOperator.ID
            case BBoxColumns.MEMO_CONTENT:
                return FilterOperator.STRING

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case BBoxColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case BBoxColumns.TAG_ID_LIST:
                return FilterValueType.TAG_ID
            case BBoxColumns.CODE_ID:
                return FilterValueType.CODE_ID
            case BBoxColumns.MEMO_CONTENT:
                return FilterValueType.INFER_FROM_OPERATOR

    def get_sort_column(self):
        match self:
            case BBoxColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case BBoxColumns.TAG_ID_LIST:
                return None
            case BBoxColumns.CODE_ID:
                return CodeORM.name
            case BBoxColumns.MEMO_CONTENT:
                return MemoORM.content

    def get_label(self) -> str:
        match self:
            case BBoxColumns.SOURCE_DOCUMENT_FILENAME:
                return "Document name"
            case BBoxColumns.TAG_ID_LIST:
                return "Tags"
            case BBoxColumns.CODE_ID:
                return "Code"
            case BBoxColumns.MEMO_CONTENT:
                return "Memo content"

    def add_subquery_filter_statements(self, query_builder: SearchBuilder):
        match self:
            case BBoxColumns.TAG_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        TagORM.id,
                        label=BBoxColumns.TAG_ID_LIST.value,
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

    def add_query_filter_statements(self, query_builder: SearchBuilder):
        match self:
            case BBoxColumns.SOURCE_DOCUMENT_FILENAME:
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

    def resolve_ids(self, db: Session, ids: list[int]) -> list[str]:
        match self:
            case BBoxColumns.TAG_ID_LIST:
                result = (
                    db.query(TagORM)
                    .filter(
                        TagORM.id.in_(ids),
                    )
                    .all()
                )
                return [tag.name for tag in result]
            case BBoxColumns.CODE_ID:
                result = (
                    db.query(CodeORM)
                    .filter(
                        CodeORM.id.in_(ids),
                    )
                    .all()
                )
                return [code.name for code in result]
            case _:
                raise NotImplementedError(f"Cannot resolve ID for {self}!")

    def resolve_names(
        self, db: Session, project_id: int, names: list[str]
    ) -> list[int]:
        match self:
            case BBoxColumns.TAG_ID_LIST:
                result = (
                    db.query(TagORM)
                    .filter(
                        TagORM.project_id == project_id,
                        TagORM.name.in_(names),
                    )
                    .all()
                )
                return [tag.id for tag in result]
            case BBoxColumns.CODE_ID:
                result = (
                    db.query(CodeORM)
                    .filter(
                        CodeORM.project_id == project_id,
                        CodeORM.name.in_(names),
                    )
                    .all()
                )
                return [code.id for code in result]
            case _:
                raise NotImplementedError(f"Cannot resolve name for {self}!")
