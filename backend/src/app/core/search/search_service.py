from collections import Counter
from typing import Dict, List, Optional, Set

from sqlalchemy import Integer, String, cast, func
from sqlalchemy.dialects.postgresql import ARRAY, array, array_agg
from sqlalchemy.orm import InstrumentedAttribute

from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.doc_type import DocType
from app.core.data.dto.search import (
    SimSearchImageHit,
    SimSearchQuery,
    SimSearchSentenceHit,
)
from app.core.data.dto.search_stats import KeywordStat, SpanEntityStat, TagStat
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM, CurrentCodeORM
from app.core.data.orm.document_tag import (
    DocumentTagORM,
    SourceDocumentDocumentTagLinkTable,
)
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
from app.core.filters.sorting import Sort, apply_sorting
from app.core.search.elasticsearch_service import ElasticSearchService
from app.core.search.simsearch_service import SimSearchService
from app.util.singleton_meta import SingletonMeta


def aggregate_ids(column: InstrumentedAttribute, label: str):
    return func.array_remove(
        array_agg(func.distinct(column), type_=ARRAY(Integer)),
        None,
        type_=ARRAY(Integer),
    ).label(label)


class SearchColumns(str, AbstractColumns):
    SOURCE_DOCUMENT_FILENAME = "SC_SOURCE_DOCUMENT_FILENAME"
    SOURCE_DOCUMENT_TYPE = "SC_SOURCE_DOCUMENT_TYPE"
    DOCUMENT_TAG_ID_LIST = "SC_DOCUMENT_TAG_ID_LIST"
    CODE_ID_LIST = "SC_CODE_ID_LIST"
    USER_ID_LIST = "SC_USER_ID_LIST"
    SPAN_ANNOTATIONS = "SC_SPAN_ANNOTATIONS"

    def get_filter_column(self, **kwargs):
        subquery_dict = kwargs["subquery_dict"]

        match self:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case SearchColumns.SOURCE_DOCUMENT_TYPE:
                return SourceDocumentORM.doctype
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
            case SearchColumns.SOURCE_DOCUMENT_TYPE:
                return FilterOperator.ID
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
            case SearchColumns.SOURCE_DOCUMENT_TYPE:
                return FilterValueType.DOC_TYPE
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
            case SearchColumns.SOURCE_DOCUMENT_TYPE:
                return SourceDocumentORM.doctype
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
            case SearchColumns.SOURCE_DOCUMENT_TYPE:
                return "Type"
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
        search_query: str,
        filter: Filter[SearchColumns],
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

            # query = query.order_by(
            #     SourceDocumentORM.id
            # )  # this is very important, otherwise pagination will not work!
            # query, pagination = apply_pagination(
            #     query=query, page_number=page + 1, page_size=page_size
            # )

        filtered_sdoc_ids = [row[0] for row in query.all()]

        if search_query.strip() == "":
            return filtered_sdoc_ids
        else:
            # use elasticseach for full text seach
            elastic_hits = ElasticSearchService().search_sdocs_by_content_query2(
                proj_id=project_id, query=search_query, sdoc_ids=set(filtered_sdoc_ids)
            )

            return [hit.sdoc_id for hit in elastic_hits.hits]

    def compute_tag_statistics(
        self,
        sdoc_ids: Set[int],
    ) -> List[TagStat]:
        with self.sqls.db_session() as db:
            # tag statistics for the sdoc_ids
            count = func.count().label("count")
            query = (
                db.query(DocumentTagORM, count)
                .join(
                    SourceDocumentDocumentTagLinkTable,
                    SourceDocumentDocumentTagLinkTable.document_tag_id
                    == DocumentTagORM.id,
                )
                .filter(
                    SourceDocumentDocumentTagLinkTable.source_document_id.in_(
                        list(sdoc_ids)
                    )
                )
                .group_by(DocumentTagORM.id)
                .order_by(count.desc())
            )
            filtered_res = query.all()
            tag_ids = [tag.id for tag, _ in filtered_res]

            # global tag statistics
            count = func.count().label("count")
            query = (
                db.query(SourceDocumentDocumentTagLinkTable.document_tag_id, count)
                .filter(SourceDocumentDocumentTagLinkTable.document_tag_id.in_(tag_ids))
                .group_by(SourceDocumentDocumentTagLinkTable.document_tag_id)
                .order_by(
                    func.array_position(
                        tag_ids, SourceDocumentDocumentTagLinkTable.document_tag_id
                    )
                )
            )
            global_res = query.all()

        return [
            TagStat(tag=tag, filtered_count=fcount, global_count=gcount)
            for (tag, fcount), (tid, gcount) in zip(filtered_res, global_res)
        ]

    def __count_keywords(
        self,
        keyword_metadata: List[SourceDocumentMetadataORM],
        top_k: Optional[int] = None,
    ) -> Dict[str, int]:
        # get keyword lists per sdoc
        keywords_list = [
            x.list_value for x in keyword_metadata if x.list_value is not None
        ]
        # flatten the list
        keywords = [
            keyword for keyword_list in keywords_list for keyword in keyword_list
        ]
        # count the keywords
        if top_k is None:
            return dict(Counter(keywords))
        else:
            return dict(Counter(keywords).most_common(top_k))

    def compute_keyword_statistics(
        self, *, proj_id: int, sdoc_ids: Set[int], top_k: int = 50
    ) -> List[KeywordStat]:
        with self.sqls.db_session() as db:
            # 1. query keyword project metadadta
            project_metadata = crud_project_meta.read_by_project_and_key(
                db=db, project_id=proj_id, key="keywords"
            )
            project_metadata_ids = [pm.id for pm in project_metadata]
            if len(project_metadata_ids) == 0:
                return []

            # 2. query keyword metadata for the sdoc_ids
            filtered_keywords_metadata = (
                db.query(SourceDocumentMetadataORM)
                .filter(
                    SourceDocumentMetadataORM.project_metadata_id.in_(
                        [pm_id for pm_id in project_metadata_ids]
                    ),
                    SourceDocumentMetadataORM.source_document_id.in_(sdoc_ids),
                )
                .all()
            )
            topk_filtered_keywords = self.__count_keywords(
                filtered_keywords_metadata, top_k=top_k
            )

            # 3. query keyword metadata for all sdocs
            all_keywords_metadata = (
                db.query(SourceDocumentMetadataORM)
                .filter(
                    SourceDocumentMetadataORM.project_metadata_id.in_(
                        [pm_id for pm_id in project_metadata_ids]
                    )
                )
                .all()
            )
            all_keywords = self.__count_keywords(all_keywords_metadata)

        # 4. construct result
        return [
            KeywordStat(
                keyword=keyword,
                filtered_count=count,
                global_count=all_keywords[keyword],
            )
            for keyword, count in topk_filtered_keywords.items()
        ]

    def compute_code_statistics(
        self,
        code_id: int,
        user_ids: Set[int],
        sdoc_ids: Set[int],
        limit: Optional[int] = None,
    ) -> List[SpanEntityStat]:
        with self.sqls.db_session() as db:
            # we always want ADocs from the SYSTEM_USER
            if not user_ids:
                user_ids = set()
            user_ids.add(SYSTEM_USER_ID)

            # code statistics for the sdoc_ids
            count = func.count().label("count")
            query = (
                db.query(
                    SpanTextORM.id,
                    SpanTextORM.text,
                    count,
                )
                .join(SpanTextORM.span_annotations)
                .join(SpanAnnotationORM.annotation_document)
                .join(SpanAnnotationORM.current_code)
                .join(CurrentCodeORM.code)
                .group_by(SpanTextORM.id)
                .filter(
                    CodeORM.id == code_id,
                    AnnotationDocumentORM.user_id.in_(list(user_ids)),
                    AnnotationDocumentORM.source_document_id.in_(list(sdoc_ids)),
                )
                .order_by(count.desc())
            )

            if limit is not None:
                query = query.limit(limit)

            filtered_res = query.all()
            span_text_ids = [row[0] for row in filtered_res]

            # global code statistics
            count = func.count().label("count")
            query = (
                db.query(
                    SpanTextORM.id,
                    SpanTextORM.text,
                    count,
                )
                .join(SpanTextORM.span_annotations)
                .join(SpanAnnotationORM.annotation_document)
                .join(SpanAnnotationORM.current_code)
                .join(CurrentCodeORM.code)
                .group_by(SpanTextORM.id)
                .filter(
                    CodeORM.id == code_id,
                    AnnotationDocumentORM.user_id.in_(list(user_ids)),
                    SpanTextORM.id.in_(span_text_ids),
                )
                .order_by(func.array_position(span_text_ids, SpanTextORM.id))
            )
            global_res = query.all()

        return [
            SpanEntityStat(
                code_id=code_id,
                span_text=ftext,
                filtered_count=fcount,
                global_count=gcount,
            )
            for (ftextid, ftext, fcount), (gtextid, gtext, gcount) in zip(
                filtered_res, global_res
            )
        ]

    def find_similar_sentences(
        self, query: SimSearchQuery
    ) -> List[SimSearchSentenceHit]:
        return self.sss.find_similar_sentences(query=query)

    def find_similar_images(self, query: SimSearchQuery) -> List[SimSearchImageHit]:
        return self.sss.find_similar_images(query=query)
