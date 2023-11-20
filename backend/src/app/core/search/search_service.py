from typing import List

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.doc_type import DocType
from app.core.data.dto.search import (
    SearchSDocsQueryParameters,
    SimSearchImageHit,
    SimSearchQuery,
    SimSearchSentenceHit,
)
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM, CurrentCodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.orm.user import UserORM
from app.core.db.sql_service import SQLService
from app.core.filters.columns import (
    AbstractColumns,
    ColumnInfo,
    create_metadata_column_info,
)
from app.core.filters.filtering import Filter, apply_filtering
from app.core.filters.filtering_operators import FilterOperator, FilterValueType
from app.core.filters.pagination import apply_pagination
from app.core.filters.sorting import Sort, apply_sorting
from app.core.search.elasticsearch_service import ElasticSearchService
from app.core.search.simsearch_service import SimSearchService
from app.util.singleton_meta import SingletonMeta
from sqlalchemy import Integer, String, cast, func
from sqlalchemy.dialects.postgresql import ARRAY, array, array_agg
from sqlalchemy.orm import InstrumentedAttribute


def aggregate_ids(column: InstrumentedAttribute, label: str):
    return func.array_remove(
        array_agg(func.distinct(column), type_=ARRAY(Integer)),
        None,
        type_=ARRAY(Integer),
    ).label(label)


class SearchColumns(str, AbstractColumns):
    SOURCE_DOCUMENT_FILENAME = "SC_SOURCE_DOCUMENT_FILENAME"
    DOCUMENT_TAG_ID_LIST = "SC_DOCUMENT_TAG_ID_LIST"
    CODE_ID_LIST = "SC_CODE_ID_LIST"
    USER_ID_LIST = "SC_USER_ID_LIST"
    SPAN_ANNOTATIONS = "SC_SPAN_ANNOTATIONS"

    def get_filter_column(self, **kwargs):
        subquery_dict = kwargs["subquery_dict"]

        match self:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case SearchColumns.DOCUMENT_TAG_ID_LIST:
                return subquery_dict[SearchColumns.DOCUMENT_TAG_ID_LIST]
            case SearchColumns.CODE_ID_LIST:
                return subquery_dict[SearchColumns.CODE_ID_LIST]
            case SearchColumns.USER_ID_LIST:
                return subquery_dict[SearchColumns.USER_ID_LIST]
            case SearchColumns.SPAN_ANNOTATIONS:
                return subquery_dict[SearchColumns.SPAN_ANNOTATIONS]

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterOperator.STRING
            case SearchColumns.DOCUMENT_TAG_ID_LIST:
                return FilterOperator.ID_LIST
            case SearchColumns.CODE_ID_LIST:
                return FilterOperator.ID_LIST
            case SearchColumns.USER_ID_LIST:
                return FilterOperator.ID_LIST
            case SearchColumns.SPAN_ANNOTATIONS:
                return FilterOperator.ID_LIST

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case SearchColumns.DOCUMENT_TAG_ID_LIST:
                return FilterValueType.TAG_ID
            case SearchColumns.CODE_ID_LIST:
                return FilterValueType.CODE_ID
            case SearchColumns.USER_ID_LIST:
                return FilterValueType.USER_ID
            case SearchColumns.SPAN_ANNOTATIONS:
                return FilterValueType.SPAN_ANNOTATION

    def get_sort_column(self, **kwargs):
        match self:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case SearchColumns.DOCUMENT_TAG_ID_LIST:
                return DocumentTagORM.title
            case SearchColumns.CODE_ID_LIST:
                return None
            case SearchColumns.USER_ID_LIST:
                return UserORM.first_name
            case SearchColumns.SPAN_ANNOTATIONS:
                return None

    def get_label(self) -> str:
        match self:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return "Document name"
            case SearchColumns.DOCUMENT_TAG_ID_LIST:
                return "Tags"
            case SearchColumns.CODE_ID_LIST:
                return "Code"
            case SearchColumns.USER_ID_LIST:
                return "Annotated by"
            case SearchColumns.SPAN_ANNOTATIONS:
                return "Span annotations"


class SearchService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls = SQLService()
        cls.sss = SimSearchService()
        return super(SearchService, cls).__new__(cls)

    def search_new_info(self, project_id) -> List[ColumnInfo[SearchColumns]]:
        with self.sqls.db_session() as db:
            metadata_column_info = create_metadata_column_info(
                db=db,
                project_id=project_id,
                allowed_doctypes=[
                    DocType.text,
                    DocType.image,
                    DocType.video,
                    DocType.audio,
                ],
            )
        return [
            ColumnInfo[SearchColumns].from_column(column) for column in SearchColumns
        ] + metadata_column_info

    def search_new(
        self,
        project_id: int,
        filter: Filter[SearchColumns],
        page: int,
        page_size: int,
        sorts: List[Sort[SearchColumns]],
    ) -> List[int]:
        with self.sqls.db_session() as db:
            tag_ids_agg = aggregate_ids(
                DocumentTagORM.id, label=SearchColumns.DOCUMENT_TAG_ID_LIST
            )
            code_ids_agg = aggregate_ids(CodeORM.id, SearchColumns.CODE_ID_LIST)
            user_ids_agg = aggregate_ids(UserORM.id, SearchColumns.USER_ID_LIST)
            span_annotation_tuples_agg = cast(
                array_agg(
                    func.distinct(array([cast(CodeORM.id, String), SpanTextORM.text])),
                ),
                ARRAY(String, dimensions=2),
            ).label(SearchColumns.SPAN_ANNOTATIONS)

            subquery = (
                db.query(
                    SourceDocumentORM.id,
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
                .join(SourceDocumentMetadataORM.project_metadata)
                .group_by(SourceDocumentORM.id)
                .filter(SourceDocumentORM.project_id == project_id)
                .subquery()
            )

            query = db.query(
                SourceDocumentORM.id,
            ).join(subquery, SourceDocumentORM.id == subquery.c.id)

            query = apply_filtering(
                query=query, filter=filter, db=db, subquery_dict=subquery.c
            )

            query = apply_sorting(query=query, sorts=sorts)

            query = query.order_by(
                SourceDocumentORM.id
            )  # this is very important, otherwise pagination will not work!
            query, pagination = apply_pagination(
                query=query, page_number=page + 1, page_size=page_size
            )

            result_rows = query.all()
            return [row[0] for row in result_rows]

    def search_sdoc_ids_by_sdoc_query_parameters(
        self, query_params: SearchSDocsQueryParameters
    ) -> List[int]:
        skip_limit = {"skip": None, "limit": None}

        with self.sqls.db_session() as db:
            sdocs_ids = []

            if crud_sdoc.count_by_project(db=db, proj_id=query_params.proj_id) == 0:
                return sdocs_ids

            if query_params.span_entities:
                sdocs_ids.append(
                    crud_sdoc.get_ids_by_span_entities(
                        db=db,
                        proj_id=query_params.proj_id,
                        user_ids=query_params.user_ids,
                        span_entities=query_params.span_entities,
                        **skip_limit,
                    )
                )

            if query_params.tag_ids:
                sdocs_ids.append(
                    crud_sdoc.get_ids_by_document_tags(
                        db=db,
                        tag_ids=query_params.tag_ids,
                        all_tags=query_params.all_tags,
                        **skip_limit,
                    )
                )

            if query_params.search_terms:
                sdocs_ids.append(
                    [
                        hit.sdoc_id
                        for hit in ElasticSearchService()
                        .search_sdocs_by_content_query(
                            proj_id=query_params.proj_id,
                            query=" ".join(
                                # FIXME we want and not or!
                                query_params.search_terms
                            ),
                            **skip_limit,
                        )
                        .hits
                    ]
                )

            if query_params.filename:
                sdocs_ids.append(
                    crud_sdoc.get_ids_by_starts_with_metadata_name(
                        db=db,
                        proj_id=query_params.proj_id,
                        starts_with=query_params.filename,
                        **skip_limit,
                    )
                )

            if query_params.keywords:
                sdocs_ids.append(
                    [
                        hit.sdoc_id
                        for hit in ElasticSearchService()
                        .search_sdocs_by_keywords_query(
                            proj_id=query_params.proj_id,
                            keywords=query_params.keywords,
                            **skip_limit,
                        )
                        .hits
                    ]
                )

            if query_params.metadata:
                sdocs_ids.append(
                    crud_sdoc.get_ids_by_metadata_and_project_id(
                        db=db,
                        proj_id=query_params.proj_id,
                        metadata=query_params.metadata,
                        **skip_limit,
                    )
                )

            if query_params.doc_types:
                sdocs_ids.append(
                    crud_sdoc.get_ids_by_doc_types_and_project_id(
                        db=db,
                        proj_id=query_params.proj_id,
                        doc_types=query_params.doc_types,
                        **skip_limit,
                    )
                )

            if len(sdocs_ids) == 0:
                # no search results, so we return all documents!
                return [
                    sdoc.id
                    for sdoc in crud_sdoc.read_by_project(
                        db=db, proj_id=query_params.proj_id, only_finished=True
                    )
                ]
            else:
                # we have search results, now we combine!
                return list(set.intersection(*map(set, sdocs_ids)))

    def find_similar_sentences(
        self, query: SimSearchQuery
    ) -> List[SimSearchSentenceHit]:
        return self.sss.find_similar_sentences(query=query)

    def find_similar_images(self, query: SimSearchQuery) -> List[SimSearchImageHit]:
        return self.sss.find_similar_images(query=query)
