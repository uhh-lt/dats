from sqlalchemy import String, cast, func
from sqlalchemy.dialects.postgresql import ARRAY, array, array_agg
from sqlalchemy.orm import Session

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_text_orm import SpanTextORM
from core.code.code_crud import crud_code
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderType
from core.doc.folder_orm import FolderORM
from core.doc.source_document_orm import SourceDocumentORM
from core.tag.tag_crud import crud_tag
from core.tag.tag_orm import TagORM
from core.user.user_crud import crud_user
from modules.word_frequency.word_frequency_orm import WordFrequencyORM
from repos.db.sql_utils import aggregate_ids, aggregate_two_ids
from systems.search_system.abstract_column import AbstractColumns
from systems.search_system.filtering_operators import FilterOperator, FilterValueType
from systems.search_system.search_builder import SearchBuilder


class WordFrequencyColumns(str, AbstractColumns):
    WORD = "WF_WORD"
    WORD_FREQUENCY = "WF_WORD_FREQUENCY"
    WORD_PERCENT = "WF_WORD_PERCENT"
    SOURCE_DOCUMENT_FREQUENCY = "WF_SOURCE_DOCUMENT_FREQUENCY"
    SOURCE_DOCUMENT_PERCENT = "WF_SOURCE_DOCUMENT_PERCENT"
    SOURCE_DOCUMENT_NAME = "WF_SOURCE_DOCUMENT_NAME"
    TAG_ID_LIST_RECURSIVE = "WF_TAG_ID_LIST_RECURSIVE"
    CODE_ID_LIST_RECURSIVE = "WF_CODE_ID_LIST_RECURSIVE"
    FOLDER_ID_LIST_RECURSIVE = "WF_FOLDER_ID_LIST_RECURSIVE"
    USER_ID_LIST = "WF_USER_ID_LIST"
    SPAN_ANNOTATIONS = "WF_SPAN_ANNOTATIONS"

    def get_filter_column(self, subquery_dict):
        match self:
            case WordFrequencyColumns.WORD:
                return WordFrequencyORM.word
            case WordFrequencyColumns.WORD_FREQUENCY:
                return WordFrequencyColumns.WORD_FREQUENCY
            case WordFrequencyColumns.WORD_PERCENT:
                return WordFrequencyColumns.WORD_PERCENT
            case WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY:
                return WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY
            case WordFrequencyColumns.SOURCE_DOCUMENT_PERCENT:
                return WordFrequencyColumns.SOURCE_DOCUMENT_PERCENT
            case WordFrequencyColumns.SOURCE_DOCUMENT_NAME:
                return SourceDocumentORM.name
            case WordFrequencyColumns.TAG_ID_LIST_RECURSIVE:
                return subquery_dict[WordFrequencyColumns.TAG_ID_LIST_RECURSIVE]
            case WordFrequencyColumns.CODE_ID_LIST_RECURSIVE:
                return subquery_dict[WordFrequencyColumns.CODE_ID_LIST_RECURSIVE]
            case WordFrequencyColumns.FOLDER_ID_LIST_RECURSIVE:
                return subquery_dict[
                    WordFrequencyColumns.FOLDER_ID_LIST_RECURSIVE.value
                ]
            case WordFrequencyColumns.USER_ID_LIST:
                return subquery_dict[WordFrequencyColumns.USER_ID_LIST]
            case WordFrequencyColumns.SPAN_ANNOTATIONS:
                return subquery_dict[WordFrequencyColumns.SPAN_ANNOTATIONS]

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case WordFrequencyColumns.WORD:
                return FilterOperator.STRING
            case WordFrequencyColumns.WORD_FREQUENCY:
                return FilterOperator.NUMBER
            case WordFrequencyColumns.WORD_PERCENT:
                return FilterOperator.NUMBER
            case WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY:
                return FilterOperator.NUMBER
            case WordFrequencyColumns.SOURCE_DOCUMENT_PERCENT:
                return FilterOperator.NUMBER
            case WordFrequencyColumns.SOURCE_DOCUMENT_NAME:
                return FilterOperator.STRING
            case WordFrequencyColumns.TAG_ID_LIST_RECURSIVE:
                return FilterOperator.ID_LIST_RECURSIVE
            case WordFrequencyColumns.CODE_ID_LIST_RECURSIVE:
                return FilterOperator.ID_LIST_RECURSIVE
            case WordFrequencyColumns.FOLDER_ID_LIST_RECURSIVE:
                return FilterOperator.ID_LIST_RECURSIVE
            case WordFrequencyColumns.USER_ID_LIST:
                return FilterOperator.ID_LIST
            case WordFrequencyColumns.SPAN_ANNOTATIONS:
                return FilterOperator.ID_LIST

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case WordFrequencyColumns.WORD:
                return FilterValueType.INFER_FROM_OPERATOR
            case WordFrequencyColumns.WORD_FREQUENCY:
                return FilterValueType.INFER_FROM_OPERATOR
            case WordFrequencyColumns.WORD_PERCENT:
                return FilterValueType.INFER_FROM_OPERATOR
            case WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY:
                return FilterValueType.INFER_FROM_OPERATOR
            case WordFrequencyColumns.SOURCE_DOCUMENT_PERCENT:
                return FilterValueType.INFER_FROM_OPERATOR
            case WordFrequencyColumns.SOURCE_DOCUMENT_NAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case WordFrequencyColumns.TAG_ID_LIST_RECURSIVE:
                return FilterValueType.TAG_ID
            case WordFrequencyColumns.CODE_ID_LIST_RECURSIVE:
                return FilterValueType.CODE_ID
            case WordFrequencyColumns.FOLDER_ID_LIST_RECURSIVE:
                return FilterValueType.FOLDER_ID
            case WordFrequencyColumns.USER_ID_LIST:
                return FilterValueType.USER_ID
            case WordFrequencyColumns.SPAN_ANNOTATIONS:
                return FilterValueType.SPAN_ANNOTATION

    def get_sort_column(self, subquery_dict=None):
        match self:
            case WordFrequencyColumns.WORD:
                return WordFrequencyORM.word
            case WordFrequencyColumns.WORD_FREQUENCY:
                return WordFrequencyColumns.WORD_FREQUENCY
            case WordFrequencyColumns.WORD_PERCENT:
                return WordFrequencyColumns.WORD_PERCENT
            case WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY:
                return WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY
            case WordFrequencyColumns.SOURCE_DOCUMENT_PERCENT:
                return WordFrequencyColumns.SOURCE_DOCUMENT_PERCENT
            case WordFrequencyColumns.SOURCE_DOCUMENT_NAME:
                return SourceDocumentORM.name
            case WordFrequencyColumns.TAG_ID_LIST_RECURSIVE:
                return None
            case WordFrequencyColumns.CODE_ID_LIST_RECURSIVE:
                return None
            case WordFrequencyColumns.FOLDER_ID_LIST_RECURSIVE:
                return None
            case WordFrequencyColumns.USER_ID_LIST:
                return None
            case WordFrequencyColumns.SPAN_ANNOTATIONS:
                return None

    def get_label(self) -> str:
        match self:
            case WordFrequencyColumns.WORD:
                return "Word"
            case WordFrequencyColumns.WORD_FREQUENCY:
                return "Word frequency"
            case WordFrequencyColumns.WORD_PERCENT:
                return "Word %"
            case WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY:
                return "Document frequency"
            case WordFrequencyColumns.SOURCE_DOCUMENT_PERCENT:
                return "Document %"
            case WordFrequencyColumns.SOURCE_DOCUMENT_NAME:
                return "Document name"
            case WordFrequencyColumns.TAG_ID_LIST_RECURSIVE:
                return "Tags"
            case WordFrequencyColumns.CODE_ID_LIST_RECURSIVE:
                return "Codes"
            case WordFrequencyColumns.FOLDER_ID_LIST_RECURSIVE:
                return "Folder"
            case WordFrequencyColumns.USER_ID_LIST:
                return "Annotated by"
            case WordFrequencyColumns.SPAN_ANNOTATIONS:
                return "Span annotations"

    def add_subquery_filter_statements(self, query_builder: SearchBuilder):
        match self:
            case WordFrequencyColumns.TAG_ID_LIST_RECURSIVE:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        TagORM.id,
                        label=WordFrequencyColumns.TAG_ID_LIST_RECURSIVE.value,
                    )
                )
                query_builder._join_subquery(SourceDocumentORM.tags, isouter=True)
            case WordFrequencyColumns.CODE_ID_LIST_RECURSIVE:
                query_builder._add_subquery_column(
                    aggregate_two_ids(
                        SpanAnnotationORM.code_id,
                        SentenceAnnotationORM.code_id,
                        label=WordFrequencyColumns.CODE_ID_LIST_RECURSIVE.value,
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
            case WordFrequencyColumns.FOLDER_ID_LIST_RECURSIVE:
                # folder_id → SDOC_FOLDER; SDOC_FOLDER.parent_id → NORMAL folder (what users filter on)
                query_builder._add_subquery_column(
                    aggregate_ids(
                        FolderORM.parent_id,
                        label=WordFrequencyColumns.FOLDER_ID_LIST_RECURSIVE.value,
                    )
                )
                query_builder._join_subquery(
                    FolderORM,
                    FolderORM.id == SourceDocumentORM.folder_id,
                    isouter=True,
                )

            case WordFrequencyColumns.USER_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        AnnotationDocumentORM.user_id,
                        WordFrequencyColumns.USER_ID_LIST.value,
                    )
                )
                query_builder._join_subquery(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.source_document_id == SourceDocumentORM.id,
                    isouter=True,
                )
            case WordFrequencyColumns.SPAN_ANNOTATIONS:
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
                    ).label(WordFrequencyColumns.SPAN_ANNOTATIONS.value)
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
            case WordFrequencyColumns.TAG_ID_LIST_RECURSIVE:
                tags = crud_tag.read_by_ids(db, ids=ids)
                return [tag.name for tag in tags]
            case WordFrequencyColumns.CODE_ID_LIST_RECURSIVE:
                codes = crud_code.read_by_ids(db, ids=ids)
                return [code.name for code in codes]
            case WordFrequencyColumns.FOLDER_ID_LIST_RECURSIVE:
                folders = crud_folder.read_by_ids(db, ids=ids)
                return [folder.name for folder in folders]
            case WordFrequencyColumns.USER_ID_LIST:
                users = crud_user.read_by_ids(db, ids=ids)
                return [user.email for user in users]
            case _:
                raise NotImplementedError(f"Cannot resolve ID for {self}!")

    def resolve_names(
        self, db: Session, project_id: int, names: list[str]
    ) -> list[int]:
        match self:
            case WordFrequencyColumns.TAG_ID_LIST_RECURSIVE:
                result = crud_tag.read_by_names(db, project_id=project_id, names=names)
                return [tag.id for tag in result]
            case WordFrequencyColumns.CODE_ID_LIST_RECURSIVE:
                result = crud_code.read_by_names(db, project_id=project_id, names=names)
                return [code.id for code in result]
            case WordFrequencyColumns.FOLDER_ID_LIST_RECURSIVE:
                result = crud_folder.read_by_names(
                    db,
                    project_id=project_id,
                    names=names,
                    folder_type=FolderType.NORMAL,
                )
                return [folder.id for folder in result]
            case WordFrequencyColumns.USER_ID_LIST:
                result = crud_user.read_by_emails(db, emails=names)
                return [user.id for user in result]
            case _:
                raise NotImplementedError(f"Cannot resolve name for {self}!")
