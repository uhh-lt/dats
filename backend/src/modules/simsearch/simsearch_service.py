from typing import Any

import numpy as np
from loguru import logger

from common.singleton_meta import SingletonMeta
from core.doc.image_embedding_crud import crud_image_embedding
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from modules.ml.embedding_service import EmbeddingService
from modules.search.sdoc_search.sdoc_search_columns import SdocColumns
from modules.search.sdoc_search.sdoc_search_service import SdocSearchService
from modules.simsearch.simsearch_dto import SimSearchImageHit, SimSearchSentenceHit
from repos.db.sql_repo import SQLRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.search_system.filtering import Filter


class SimSearchService(metaclass=SingletonMeta):
    def __new__(cls):
        cls.emb = EmbeddingService()
        cls.weaviate = WeaviateRepo()
        cls.sqlr = SQLRepo()
        cls.sdoc_search = SdocSearchService()
        return super(SimSearchService, cls).__new__(cls)

    def _encode_query(
        self,
        text_query: list[str] | None = None,
        image_query_id: int | None = None,
        document_query: bool = False,
    ) -> np.ndarray:
        if text_query is None and image_query_id is None:
            msg = "Either text_query or image_query must be set!"
            logger.error(msg)
            raise ValueError(msg)
        elif text_query is not None and image_query_id is not None:
            msg = "Only one of text_query or image_query must be set!"
            logger.error(msg)
            raise ValueError(msg)
        elif text_query is not None:
            query_emb = (
                self.emb.encode_document(" ".join(text_query))
                if document_query
                else self.emb.encode_sentences(sentences=text_query)[0]
            )
        elif image_query_id is not None:
            query_emb = self.emb.encode_image(sdoc_id=image_query_id)
        else:
            msg = "This should never happend! Unknown Error!"
            logger.error(msg)
            raise ValueError(msg)
        return query_emb

    def __parse_query_param(self, query: str | list[str] | int) -> dict[str, Any]:
        query_params = {
            "text_query": None,
            "image_query_id": None,
            "document_query": False,
        }

        if isinstance(query, int) or (isinstance(query, str) and query.isdigit()):
            query_params["image_query_id"] = int(query)
        elif isinstance(query, str) and not query.isdigit():
            query_params["text_query"] = [query]
        elif isinstance(query, list):
            query_params["text_query"] = query
            query_params["document_query"] = True

        return query_params

    def find_similar_sentences(
        self,
        proj_id: int,
        query: str | list[str] | int,
        top_k: int,
        threshold: float,
        sdoc_ids_to_search: list[int] | None = None,
    ) -> list[SimSearchSentenceHit]:
        query_emb = self._encode_query(
            **self.__parse_query_param(query),
        ).tolist()

        with self.weaviate.weaviate_session() as client:
            results = crud_sentence_embedding.search_near_vector_in_sdoc_ids(
                client=client,
                vector=query_emb,
                project_id=proj_id,
                k=top_k,
                threshold=threshold,
                sdoc_ids=sdoc_ids_to_search,
            )

        return [
            SimSearchSentenceHit(
                sdoc_id=result.id.sdoc_id,
                sentence_id=result.id.sentence_id,
                score=result.score,
            )
            for result in results
        ]

    def find_similar_sentences_with_filter(
        self,
        proj_id: int,
        query: str | list[str] | int,
        top_k: int,
        threshold: float,
        filter: Filter[SdocColumns],
    ) -> list[SimSearchSentenceHit]:
        with self.sqlr.db_session() as db:
            filtered_sdoc_ids, _ = self.sdoc_search.filter_sdoc_ids(
                db=db, project_id=proj_id, folder_id=None, filter=filter
            )

        return SimSearchService().find_similar_sentences(
            sdoc_ids_to_search=filtered_sdoc_ids,
            proj_id=proj_id,
            query=query,
            top_k=top_k,
            threshold=threshold,
        )

    def find_similar_images(
        self,
        sdoc_ids_to_search: list[int],
        proj_id: int,
        query: str | list[str] | int,
        top_k: int,
        threshold: float,
    ) -> list[SimSearchImageHit]:
        query_emb = self._encode_query(
            **self.__parse_query_param(query),
        ).tolist()

        with self.weaviate.weaviate_session() as client:
            results = crud_image_embedding.search_near_vector_in_sdoc_ids(
                client=client,
                vector=query_emb,
                project_id=proj_id,
                k=top_k,
                threshold=threshold,
                sdoc_ids=sdoc_ids_to_search,
            )

        return [
            SimSearchImageHit(
                sdoc_id=result.id.sdoc_id,
                score=result.score,
            )
            for result in results
        ]

    def find_similar_images_with_filter(
        self,
        proj_id: int,
        query: str | list[str] | int,
        top_k: int,
        threshold: float,
        filter: Filter[SdocColumns],
    ) -> list[SimSearchImageHit]:
        with self.sqlr.db_session() as db:
            filtered_sdoc_ids, _ = self.sdoc_search.filter_sdoc_ids(
                db=db, project_id=proj_id, folder_id=None, filter=filter
            )

        return SimSearchService().find_similar_images(
            sdoc_ids_to_search=filtered_sdoc_ids,
            proj_id=proj_id,
            query=query,
            top_k=top_k,
            threshold=threshold,
        )
