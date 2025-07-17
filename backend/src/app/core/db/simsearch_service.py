from typing import Any, Dict, List, Optional, Union

import numpy as np
from loguru import logger

from app.core.data.dto.search import SimSearchImageHit, SimSearchSentenceHit
from app.core.ml.embedding_service import EmbeddingService
from app.core.vector.crud.image_embedding import crud_image_embedding
from app.core.vector.crud.sentence_embedding import crud_sentence_embedding
from app.core.vector.weaviate_service import WeaviateService
from app.util.singleton_meta import SingletonMeta


class SimSearchService(metaclass=SingletonMeta):
    def __new__(cls):
        cls.emb = EmbeddingService()
        cls.weaviate = WeaviateService()
        return super(SimSearchService, cls).__new__(cls)

    def _encode_query(
        self,
        text_query: Optional[List[str]] = None,
        image_query_id: Optional[int] = None,
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

    def __parse_query_param(self, query: Union[str, List[str], int]) -> Dict[str, Any]:
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
        query: Union[str, List[str], int],
        top_k: int,
        threshold: float,
        sdoc_ids_to_search: Optional[List[int]] = None,
    ) -> List[SimSearchSentenceHit]:
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

    def find_similar_images(
        self,
        sdoc_ids_to_search: List[int],
        proj_id: int,
        query: Union[str, List[str], int],
        top_k: int,
        threshold: float,
    ) -> List[SimSearchImageHit]:
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
