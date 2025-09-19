from sqlalchemy import String, cast, func
from sqlalchemy.dialects.postgresql import ARRAY, array, array_agg
from sqlalchemy.orm import Session

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_text_orm import SpanTextORM
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.tag.tag_orm import TagORM
from core.user.user_orm import UserORM
from repos.db.sql_utils import aggregate_ids, aggregate_two_ids
from systems.search_system.column_info import AbstractColumns
from systems.search_system.filtering_operators import FilterOperator, FilterValueType
from systems.search_system.search_builder import SearchBuilder


class SdocColumns(str, AbstractColumns):
    SOURCE_DOCUMENT_TYPE = "SD_SOURCE_DOCUMENT_TYPE"
    SOURCE_DOCUMENT_NAME = "SD_SOURCE_DOCUMENT_NAME"
    TAG_ID_LIST = "SD_TAG_ID_LIST"
    CODE_ID_LIST = "SD_CODE_ID_LIST"
    USER_ID_LIST = "SD_USER_ID_LIST"
    SPAN_ANNOTATIONS = "SD_SPAN_ANNOTATIONS"

    def get_filter_column(self, subquery_dict: dict):
        match self:
            case SdocColumns.SOURCE_DOCUMENT_NAME:
                return SourceDocumentORM.name
            case SdocColumns.SOURCE_DOCUMENT_TYPE:
                return SourceDocumentORM.doctype
            case SdocColumns.TAG_ID_LIST:
                return subquery_dict[SdocColumns.TAG_ID_LIST.value]
            case SdocColumns.CODE_ID_LIST:
                return subquery_dict[SdocColumns.CODE_ID_LIST.value]
            case SdocColumns.USER_ID_LIST:
                return subquery_dict[SdocColumns.USER_ID_LIST.value]
            case SdocColumns.SPAN_ANNOTATIONS:
                return subquery_dict[SdocColumns.SPAN_ANNOTATIONS.value]

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case SdocColumns.SOURCE_DOCUMENT_NAME:
                return FilterOperator.STRING
            case SdocColumns.SOURCE_DOCUMENT_TYPE:
                return FilterOperator.ID
            case SdocColumns.TAG_ID_LIST:
                return FilterOperator.ID_LIST
            case SdocColumns.CODE_ID_LIST:
                return FilterOperator.ID_LIST
            case SdocColumns.USER_ID_LIST:
                return FilterOperator.ID_LIST
            case SdocColumns.SPAN_ANNOTATIONS:
                return FilterOperator.ID_LIST

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case SdocColumns.SOURCE_DOCUMENT_NAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case SdocColumns.SOURCE_DOCUMENT_TYPE:
                return FilterValueType.DOC_TYPE
            case SdocColumns.TAG_ID_LIST:
                return FilterValueType.TAG_ID
            case SdocColumns.CODE_ID_LIST:
                return FilterValueType.CODE_ID
            case SdocColumns.USER_ID_LIST:
                return FilterValueType.USER_ID
            case SdocColumns.SPAN_ANNOTATIONS:
                return FilterValueType.SPAN_ANNOTATION

    def get_sort_column(self):
        match self:
            case SdocColumns.SOURCE_DOCUMENT_NAME:
                return SourceDocumentORM.name
            case SdocColumns.SOURCE_DOCUMENT_TYPE:
                return SourceDocumentORM.doctype
            case SdocColumns.TAG_ID_LIST:
                return None
            case SdocColumns.CODE_ID_LIST:
                return None
            case SdocColumns.USER_ID_LIST:
                return None
            case SdocColumns.SPAN_ANNOTATIONS:
                return None

    def get_label(self) -> str:
        match self:
            case SdocColumns.SOURCE_DOCUMENT_NAME:
                return "Document name"
            case SdocColumns.SOURCE_DOCUMENT_TYPE:
                return "Type"
            case SdocColumns.TAG_ID_LIST:
                return "Tags"
            case SdocColumns.CODE_ID_LIST:
                return "Code"
            case SdocColumns.USER_ID_LIST:
                return "Annotated by"
            case SdocColumns.SPAN_ANNOTATIONS:
                return "Span annotations"

    def add_subquery_filter_statements(self, query_builder: SearchBuilder):
        match self:
            case SdocColumns.TAG_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        TagORM.id,
                        label=SdocColumns.TAG_ID_LIST.value,
                    )
                )
                query_builder._join_subquery(SourceDocumentORM.tags, isouter=True)
            case SdocColumns.CODE_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_two_ids(
                        SpanAnnotationORM.code_id,
                        SentenceAnnotationORM.code_id,
                        label=SdocColumns.CODE_ID_LIST.value,
                    )
                )
                query_builder._join_subquery(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.source_document_id == SourceDocumentORM.id,
                    isouter=True,
                )
                query_builder._join_subquery(
                    SpanAnnotationORM,
                    SpanAnnotationORM.annotation_document_id
                    == AnnotationDocumentORM.id,
                    isouter=True,
                )
                query_builder._join_subquery(
                    SentenceAnnotationORM,
                    SentenceAnnotationORM.annotation_document_id
                    == AnnotationDocumentORM.id,
                    isouter=True,
                )

            case SdocColumns.USER_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        AnnotationDocumentORM.user_id, SdocColumns.USER_ID_LIST.value
                    )
                )
                query_builder._join_subquery(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.source_document_id == SourceDocumentORM.id,
                    isouter=True,
                )
            case SdocColumns.SPAN_ANNOTATIONS:
                query_builder._add_subquery_column(
                    cast(
                        array_agg(
                            func.distinct(
                                array(
                                    [
                                        cast(SpanAnnotationORM.code_id, String),
                                        SpanTextORM.text,
                                    ]
                                )
                            ),
                        ),
                        ARRAY(String, dimensions=2),
                    ).label(SdocColumns.SPAN_ANNOTATIONS.value)
                )
                query_builder._join_subquery(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.source_document_id == SourceDocumentORM.id,
                    isouter=True,
                )
                query_builder._join_subquery(
                    SpanAnnotationORM,
                    SpanAnnotationORM.annotation_document_id
                    == AnnotationDocumentORM.id,
                    isouter=True,
                )
                query_builder._join_subquery(
                    SpanTextORM,
                    SpanTextORM.id == SpanAnnotationORM.span_text_id,
                    isouter=True,
                )

    def add_query_filter_statements(self, query_builder: SearchBuilder):
        pass

    def resolve_ids(self, db: Session, ids: list[int]) -> list[str]:
        match self:
            case SdocColumns.TAG_ID_LIST:
                result = (
                    db.query(TagORM)
                    .filter(
                        TagORM.id.in_(ids),
                    )
                    .all()
                )
                return [tag.name for tag in result]
            case SdocColumns.CODE_ID_LIST:
                result = (
                    db.query(CodeORM)
                    .filter(
                        CodeORM.id.in_(ids),
                    )
                    .all()
                )
                return [code.name for code in result]
            case SdocColumns.USER_ID_LIST:
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
            case SdocColumns.TAG_ID_LIST:
                result = (
                    db.query(TagORM)
                    .filter(
                        TagORM.project_id == project_id,
                        TagORM.name.in_(names),
                    )
                    .all()
                )
                return [tag.id for tag in result]
            case SdocColumns.CODE_ID_LIST:
                result = (
                    db.query(CodeORM)
                    .filter(
                        CodeORM.project_id == project_id,
                        CodeORM.name.in_(names),
                    )
                    .all()
                )
                return [code.id for code in result]
            case SdocColumns.USER_ID_LIST:
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
