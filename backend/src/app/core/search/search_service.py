from typing import List

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.filter import AggregatedColumn, Filter
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
from app.core.data.orm.user import UserORM
from app.core.db.sql_service import SQLService
from app.core.search.elasticsearch_service import ElasticSearchService
from app.core.search.simsearch_service import SimSearchService
from app.util.singleton_meta import SingletonMeta
from sqlalchemy import Column, Integer, and_, func
from sqlalchemy.dialects.postgresql import ARRAY, array_agg


def aggregate_ids(column: Column, label: str):
    return func.array_remove(
        array_agg(func.distinct(column), type=ARRAY(Integer)),
        None,
        type_=ARRAY(Integer),
    ).label(label)


class SearchService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls = SQLService()
        cls.sss = SimSearchService()
        return super(SearchService, cls).__new__(cls)

    def search_new(self, project_id: int, filter: Filter) -> List[int]:
        with self.sqls.db_session() as db:
            tag_ids_agg = aggregate_ids(
                DocumentTagORM.id, label=AggregatedColumn.DOCUMENT_TAG_IDS_LIST
            )
            code_ids_agg = aggregate_ids(CodeORM.id, AggregatedColumn.CODE_IDS_LIST)
            user_ids_agg = aggregate_ids(UserORM.id, AggregatedColumn.USER_IDS_LIST)
            span_annotation_ids_agg = aggregate_ids(
                SpanAnnotationORM.id, AggregatedColumn.SPAN_ANNOTATION_IDS_LIST
            )

            subquery = (
                db.query(
                    SourceDocumentORM.id,
                    tag_ids_agg,
                    code_ids_agg,
                    user_ids_agg,
                    span_annotation_ids_agg,
                )
                .join(SourceDocumentORM.document_tags, isouter=True)
                .join(SourceDocumentORM.annotation_documents, isouter=True)
                .join(AnnotationDocumentORM.user)
                .join(AnnotationDocumentORM.span_annotations)
                .join(SpanAnnotationORM.current_code)
                .join(CurrentCodeORM.code)
                .filter(SourceDocumentORM.project_id == project_id)
                .group_by(SourceDocumentORM.id)
                .subquery()
            )

            query = (
                db.query(
                    SourceDocumentORM.id,
                    subquery.c[AggregatedColumn.DOCUMENT_TAG_IDS_LIST],
                    subquery.c[AggregatedColumn.USER_IDS_LIST],
                    subquery.c[AggregatedColumn.CODE_IDS_LIST],
                    subquery.c[AggregatedColumn.SPAN_ANNOTATION_IDS_LIST],
                )
                .join(subquery, SourceDocumentORM.id == subquery.c.id)
                .filter(
                    filter.get_sqlalchemy_expression(db=db, subquery_dict=subquery.c),
                )
            )

            result_rows = query.all()
            print(result_rows)

            return list([row[0] for row in result_rows])

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
