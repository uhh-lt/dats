from typing import (
    Any,
    Callable,
    Dict,
    List,
    Optional,
    Sequence,
    Set,
    Tuple,
    TypeVar,
    Union,
)

import numpy as np
from loguru import logger

from app.core.data.dto.search import (
    SimSearchDocumentHit,
    SimSearchImageHit,
    SimSearchSentenceHit,
)
from app.core.db.index_type import IndexType
from app.core.db.sql_service import SQLService
from app.core.db.vector_index_service import VectorIndexService
from app.core.ml.embedding_service import EmbeddingService
from app.util.singleton_meta import SingletonMeta

SimSearchHit = TypeVar("SimSearchHit")


class SimSearchService(metaclass=SingletonMeta):
    def __new__(cls):
        cls.vis = VectorIndexService()
        cls.sqls = SQLService()
        cls.emb = EmbeddingService()
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
                else self.emb.encode_sentences(sentences=text_query)
            )
        elif image_query_id is not None:
            query_emb = self.emb.encode_image(image_sdoc_id=image_query_id)
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
        return self.find_similar(
            proj_id, IndexType.SENTENCE, sdoc_ids_to_search, query, top_k, threshold
        )  # type: ignore

    def find_similar_images(
        self,
        sdoc_ids_to_search: List[int],
        proj_id: int,
        query: Union[str, List[str], int],
        top_k: int,
        threshold: float,
    ) -> List[SimSearchImageHit]:
        return self.find_similar(
            proj_id, IndexType.IMAGE, sdoc_ids_to_search, query, top_k, threshold
        )  # type: ignore

    def find_similar(
        self,
        proj_id: int,
        index_type: IndexType,
        sdoc_ids_to_search: List[int] | None,
        query: Union[str, List[str], int],
        top_k: int,
        threshold: float,
    ) -> List[SimSearchSentenceHit] | List[SimSearchImageHit]:
        query_emb = self._encode_query(
            **self.__parse_query_param(query),
        )
        return self.vis.search_index(
            proj_id=proj_id,
            index_type=index_type,
            query_emb=query_emb,
            top_k=top_k,
            threshold=threshold,
            sdoc_ids_to_search=sdoc_ids_to_search,
        )

    def knn_documents(
        self,
        proj_id: int,
        classify: Sequence[int],
        gold: Sequence[int],
        k: int = 3,
    ) -> List[List[SimSearchDocumentHit]]:
        return self.vis.knn(proj_id, IndexType.DOCUMENT, classify, gold, k)

    def suggest_similar_sentences(
        self,
        proj_id: int,
        pos_sdoc_sent_ids: List[Tuple[int, int]],
        neg_sdoc_sent_ids: List[Tuple[int, int]],
        top_k: int,
    ) -> List[SimSearchSentenceHit]:
        hits = self.vis.suggest(pos_sdoc_sent_ids, proj_id, top_k, IndexType.SENTENCE)
        marked_sdoc_sent_ids = {
            entry for entry in pos_sdoc_sent_ids + neg_sdoc_sent_ids
        }
        hits = [
            h for h in hits if (h.sdoc_id, h.sentence_id) not in marked_sdoc_sent_ids
        ]
        hits.sort(key=lambda x: (x.sdoc_id, x.sentence_id))
        hits = self.__unique_consecutive(hits, key=lambda x: (x.sdoc_id, x.sentence_id))
        candidates = [(h.sdoc_id, h.sentence_id) for h in hits]
        nearest = self.vis.suggest(
            candidates,
            proj_id,
            1,
            IndexType.SENTENCE,
        )
        results = []
        for hit, near in zip(hits, nearest):
            if (near.sdoc_id, near.sentence_id) not in neg_sdoc_sent_ids:
                results.append(hit)
        results.sort(key=lambda x: x.score, reverse=True)
        return results[0 : min(len(results), top_k)]

    def suggest_similar_documents(
        self,
        proj_id: int,
        pos_sdoc_ids: Set[int],
        neg_sdoc_ids: Set[int],
        top_k: int,
        unique: bool,
    ) -> List[SimSearchDocumentHit]:
        marked_sdoc_ids = pos_sdoc_ids.union(neg_sdoc_ids)
        hits = self.vis.suggest(pos_sdoc_ids, proj_id, top_k, IndexType.DOCUMENT)
        hits = [h for h in hits if h.sdoc_id not in marked_sdoc_ids]
        hits.sort(key=lambda x: (x.sdoc_id, -x.score))
        if unique:
            hits = self.__unique_consecutive(
                hits, key=lambda x: (x.sdoc_id, x.compared_sdoc_id)
            )
        if len(neg_sdoc_ids) > 0:
            candidates = {h.sdoc_id for h in hits}
            nearest = self.vis.suggest(
                candidates,
                proj_id,
                1,
                IndexType.DOCUMENT,
            )
            results = []
            for hit, near in zip(hits, nearest):
                if near.sdoc_id not in neg_sdoc_ids:
                    results.append(hit)
        else:
            results = hits
        results.sort(key=lambda x: x.score, reverse=True)
        return hits

    def __unique_consecutive(
        self, hits: List[SimSearchHit], key: Callable[[SimSearchHit], Any]
    ) -> List[SimSearchHit]:
        if len(hits) == 0:
            return []
        current = hits[0]
        result = [current]
        for hit in hits:
            if key(hit) != key(current):
                current = hit
                result.append(hit)
        return result
