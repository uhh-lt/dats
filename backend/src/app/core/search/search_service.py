from typing import Dict, List, Union

from PIL.Image import Image

from app.core.data.crud.faiss_sentence_source_document_link import (
    crud_faiss_sentence_link,
)
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.search import (
    SearchSDocsQueryParameters,
    SimSearchImageHit,
    SimSearchSentenceHit,
)
from app.core.db.sql_service import SQLService
from app.core.search.elasticsearch_service import ElasticSearchService
from app.core.search.faiss_index_service import FaissIndexService
from app.core.search.index_type import IndexType
from app.docprepro.simsearch import (
    find_similar_images_apply_async,
    find_similar_sentences_apply_async,
)
from app.util.singleton_meta import SingletonMeta


class SearchService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls = SQLService()
        return super(SearchService, cls).__new__(cls)

    def search_sdoc_ids_by_sdoc_query_parameters(
        self, query_params: SearchSDocsQueryParameters
    ) -> List[int]:
        skip_limit = {"skip": None, "limit": None}

        with self.sqls.db_session() as db:
            sdocs_ids = []

            if query_params.span_entities:
                sdocs_ids.append(
                    crud_sdoc.get_ids_by_span_entities(
                        db=db,
                        proj_id=query_params.proj_id,
                        user_ids=query_params.user_ids,
                        span_entities=query_params.span_entities,
                        **skip_limit
                    )
                )

            if query_params.tag_ids:
                sdocs_ids.append(
                    crud_sdoc.get_ids_by_document_tags(
                        db=db,
                        tag_ids=query_params.tag_ids,
                        all_tags=query_params.all_tags,
                        **skip_limit
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
                            **skip_limit
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
                        **skip_limit
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
                            **skip_limit
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
                        **skip_limit
                    )
                )

            if query_params.doc_types:
                sdocs_ids.append(
                    crud_sdoc.get_ids_by_doc_types_and_project_id(
                        db=db,
                        proj_id=query_params.proj_id,
                        doc_types=query_params.doc_types,
                        **skip_limit
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
        self, proj_id: int, query: Union[str, Image], top_k: int = 10
    ) -> List[SimSearchSentenceHit]:
        FaissIndexService().index_exists(
            proj_id=proj_id, index_type=IndexType.TEXT, raise_if_not_exists=True
        )
        # perform the simsearch and get the span anno ids with scores
        top_k: Dict[int, float] = find_similar_sentences_apply_async(
            proj_id=proj_id, query=query, top_k=top_k
        ).get()

        with self.sqls.db_session() as db:
            faiss_links = crud_faiss_sentence_link.read_by_ids(
                db=db, ids=list(top_k.keys())
            )

            return [
                SimSearchSentenceHit(
                    sdoc_id=faiss_link.source_document_id,
                    score=score,
                    sentence_id=faiss_link.sentence_id,
                )
                for faiss_link, score in zip(faiss_links, top_k.values())
            ]

    def find_similar_images(
        self, proj_id: int, query: Union[str, int], top_k: int = 10
    ) -> List[SimSearchImageHit]:
        FaissIndexService().index_exists(
            proj_id=proj_id, index_type=IndexType.IMAGE, raise_if_not_exists=True
        )
        # perform the simsearch and get the sdoc ids with scores
        top_k: Dict[int, float] = find_similar_images_apply_async(
            proj_id=proj_id, query=query, top_k=top_k
        ).get()

        with self.sqls.db_session() as db:
            sdoc_orms = crud_sdoc.read_by_ids(db=db, ids=list(top_k.keys()))

        return [
            SimSearchImageHit(sdoc_id=sdoc_orm.id, score=score)
            for sdoc_orm, score in zip(sdoc_orms, top_k.values())
        ]
