from typing import List

from sqlalchemy import String, cast, distinct, func
from sqlalchemy.dialects.postgresql import ARRAY, array, array_agg

from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.doc_type import DocType
from app.core.data.dto.analysis import WordFrequencyResult, WordFrequencyStat
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM, CurrentCodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.orm.user import UserORM
from app.core.data.orm.word_frequency import WordFrequencyORM
from app.core.db.sql_service import SQLService
from app.core.filters.columns import (
    AbstractColumns,
    ColumnInfo,
)
from app.core.filters.filtering import Filter, apply_filtering
from app.core.filters.filtering_operators import FilterOperator, FilterValueType
from app.core.filters.pagination import apply_pagination
from app.core.filters.sorting import Sort, apply_sorting
from app.core.search.search_service import aggregate_ids


class WordFrequencyColumns(str, AbstractColumns):
    WORD = "WF_WORD"
    WORD_FREQUENCY = "WF_WORD_FREQUENCY"
    WORD_PERCENT = "WF_WORD_PERCENT"
    SOURCE_DOCUMENT_FREQUENCY = "WF_SOURCE_DOCUMENT_FREQUENCY"
    SOURCE_DOCUMENT_PERCENT = "WF_SOURCE_DOCUMENT_PERCENT"
    SOURCE_DOCUMENT_FILENAME = "WF_SOURCE_DOCUMENT_FILENAME"
    DOCUMENT_TAG_ID_LIST = "WF_DOCUMENT_TAG_ID_LIST"
    CODE_ID_LIST = "WF_CODE_ID_LIST"
    USER_ID_LIST = "WF_USER_ID_LIST"
    SPAN_ANNOTATIONS = "WF_SPAN_ANNOTATIONS"

    def get_filter_column(self, **kwargs):
        subquery_dict = kwargs["subquery_dict"]

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
            case WordFrequencyColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case WordFrequencyColumns.DOCUMENT_TAG_ID_LIST:
                return subquery_dict[WordFrequencyColumns.DOCUMENT_TAG_ID_LIST]
            case WordFrequencyColumns.CODE_ID_LIST:
                return subquery_dict[WordFrequencyColumns.CODE_ID_LIST]
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
            case WordFrequencyColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterOperator.STRING
            case WordFrequencyColumns.DOCUMENT_TAG_ID_LIST:
                return FilterOperator.ID_LIST
            case WordFrequencyColumns.CODE_ID_LIST:
                return FilterOperator.ID_LIST
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
            case WordFrequencyColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case WordFrequencyColumns.DOCUMENT_TAG_ID_LIST:
                return FilterValueType.TAG_ID
            case WordFrequencyColumns.CODE_ID_LIST:
                return FilterValueType.CODE_ID
            case WordFrequencyColumns.USER_ID_LIST:
                return FilterValueType.USER_ID
            case WordFrequencyColumns.SPAN_ANNOTATIONS:
                return FilterValueType.SPAN_ANNOTATION

    def get_sort_column(self, **kwargs):
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
            case WordFrequencyColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case WordFrequencyColumns.DOCUMENT_TAG_ID_LIST:
                return DocumentTagORM.name
            case WordFrequencyColumns.CODE_ID_LIST:
                return None
            case WordFrequencyColumns.USER_ID_LIST:
                return UserORM.first_name
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
            case WordFrequencyColumns.SOURCE_DOCUMENT_FILENAME:
                return "Document name"
            case WordFrequencyColumns.DOCUMENT_TAG_ID_LIST:
                return "Tags"
            case WordFrequencyColumns.CODE_ID_LIST:
                return "Codes"
            case WordFrequencyColumns.USER_ID_LIST:
                return "Annotated by"
            case WordFrequencyColumns.SPAN_ANNOTATIONS:
                return "Span annotations"


def word_frequency_info(
    project_id: int,
) -> List[ColumnInfo[WordFrequencyColumns]]:
    with SQLService().db_session() as db:
        metadata_column_info = crud_project_meta.create_metadata_column_info(
            db=db, project_id=project_id, allowed_doctypes=[DocType.text]
        )
    return [
        ColumnInfo[WordFrequencyColumns].from_column(column)
        for column in WordFrequencyColumns
    ] + metadata_column_info


def word_frequency(
    project_id: int,
    filter: Filter[WordFrequencyColumns],
    page: int,
    page_size: int,
    sorts: List[Sort[WordFrequencyColumns]],
) -> WordFrequencyResult:
    # project_metadata_id has to refer to a DATE metadata

    with SQLService().db_session() as db:
        tag_ids_agg = aggregate_ids(
            DocumentTagORM.id, label=WordFrequencyColumns.DOCUMENT_TAG_ID_LIST
        )
        code_ids_agg = aggregate_ids(CodeORM.id, WordFrequencyColumns.CODE_ID_LIST)
        user_ids_agg = aggregate_ids(UserORM.id, WordFrequencyColumns.USER_ID_LIST)
        span_annotation_tuples_agg = cast(
            array_agg(
                func.distinct(array([cast(CodeORM.id, String), SpanTextORM.text])),
            ),
            ARRAY(String, dimensions=2),
        ).label(WordFrequencyColumns.SPAN_ANNOTATIONS)

        # subquery
        subquery = (
            db.query(
                SourceDocumentORM.id.label("id"),
                tag_ids_agg,
                code_ids_agg,
                user_ids_agg,
                span_annotation_tuples_agg,
            )
            .join(SourceDocumentORM.document_tags, isouter=True)
            .join(SourceDocumentORM.annotation_documents)
            .join(AnnotationDocumentORM.user)
            .join(AnnotationDocumentORM.span_annotations)
            .join(SpanAnnotationORM.span_text)
            .join(SpanAnnotationORM.current_code)
            .join(CurrentCodeORM.code)
            .join(SourceDocumentORM.metadata_)
            .filter(
                SourceDocumentORM.project_id == project_id,
            )
            .group_by(SourceDocumentORM.id)
            .subquery()
        )

        # count all words query (uses filtering)
        global_word_count_agg = func.sum(WordFrequencyORM.count)
        query = db.query(global_word_count_agg).join(
            subquery, WordFrequencyORM.sdoc_id == subquery.c.id
        )
        query = apply_filtering(
            query=query, filter=filter, db=db, subquery_dict=subquery.c
        )
        global_word_count = query.scalar()

        # count all sdocs query (uses filtering)
        global_sdoc_count_agg = func.count(distinct(WordFrequencyORM.sdoc_id))
        query = db.query(global_sdoc_count_agg).join(
            subquery, WordFrequencyORM.sdoc_id == subquery.c.id
        )
        query = apply_filtering(
            query=query, filter=filter, db=db, subquery_dict=subquery.c
        )
        global_sdoc_count = query.scalar()

        # early return if no results
        if global_sdoc_count is None or global_word_count is None:
            return WordFrequencyResult(
                total_results=0,
                sdocs_total=0,
                words_total=0,
                word_frequencies=[],
            )

        # main query (uses filtering, sorting and pagination)
        word_count_acc = func.sum(WordFrequencyORM.count).label(
            WordFrequencyColumns.WORD_FREQUENCY
        )
        sdocs_count_agg = func.count(distinct(WordFrequencyORM.sdoc_id)).label(
            WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY
        )
        query = db.query(
            WordFrequencyORM.word,
            word_count_acc,
            (word_count_acc / global_word_count).label(
                WordFrequencyColumns.WORD_PERCENT
            ),
            sdocs_count_agg,
            (sdocs_count_agg / global_sdoc_count).label(
                WordFrequencyColumns.SOURCE_DOCUMENT_PERCENT
            ),
        ).join(subquery, WordFrequencyORM.sdoc_id == subquery.c.id)

        query = apply_filtering(
            query=query, filter=filter, db=db, subquery_dict=subquery.c
        )

        query = query.group_by(WordFrequencyORM.word)

        # ordering is very important, otherwise pagination will not work!
        if len(sorts) == 0:
            query = query.order_by(word_count_acc.desc())
        else:
            query = apply_sorting(query=query, sorts=sorts, db=db)

        query, pagination = apply_pagination(
            query=query, page_number=page + 1, page_size=page_size
        )

        word_frequency_stats = [
            WordFrequencyStat(
                word=row[0],
                count=row[1],
                word_percent=row[2],
                sdocs=row[3],
                sdocs_percent=row[4],
            )
            for row in query.all()
        ]

        return WordFrequencyResult(
            total_results=pagination.total_results,
            sdocs_total=global_sdoc_count,
            words_total=global_word_count,
            word_frequencies=word_frequency_stats,
        )
