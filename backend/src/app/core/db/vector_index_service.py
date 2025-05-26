from abc import ABC
from typing import Iterable, List, Sequence, Tuple

import numpy as np
from config import conf
from loguru import logger

from app.core.data.dto.search import SimSearchDocumentHit, SimSearchSentenceHit
from app.core.db.index_type import IndexType
from app.util.singleton_meta import SingletonMeta


class VectorIndexService(ABC, metaclass=SingletonMeta):
    def __new__(cls, reset_vector_index=False):
        index_name: str = conf.vector_index.service
        match index_name:
            case "qdrant":
                # import and init QdrantService
                from app.core.db.qdrant_service import QdrantService

                return QdrantService(flush=reset_vector_index)
            case "typesense":
                # import and init TypesenseService
                from app.core.db.typesense_service import TypesenseService

                return TypesenseService(flush=reset_vector_index)
            case "weaviate":
                # import and init WeaviateService
                from app.core.db.weaviate_service import WeaviateService

                instance = super(VectorIndexService, WeaviateService).__new__(
                    WeaviateService
                )
            case _:
                msg = (
                    f"VECTOR_INDEX environment variable not correctly set: {index_name}"
                )
                logger.error(msg)
                raise SystemExit(msg)
        return instance

    def add_embeddings_to_index(
        self,
        type: IndexType,
        proj_id: int,
        sdoc_id: Iterable[int],
        embeddings: Iterable[np.ndarray],
    ):
        raise NotImplementedError

    def remove_embeddings_from_index(self, type: IndexType, sdoc_id: int):
        raise NotImplementedError

    def remove_project_from_index(self, proj_id: int):
        raise NotImplementedError

    def remove_project_index(self, proj_id: int, type: IndexType):
        """Deletes all data of type `type` in project with id `project_id`"""
        raise NotImplementedError

    def search_index(
        self,
        proj_id: int,
        index_type: IndexType,
        query_emb: np.ndarray,
        sdoc_ids_to_search: List[int] | None,
        top_k: int = 10,
        threshold: float = 0.0,
    ) -> List[SimSearchSentenceHit]:
        raise NotImplementedError

    def knn(
        self,
        proj_id: int,
        index_type: IndexType,
        sdoc_ids_to_search: Sequence[int],
        sdoc_ids_known: Sequence[int],
        k: int = 3,
    ) -> List[List[SimSearchDocumentHit]]:
        """Returns the k-nearest neighbors within the (unlabeled) `sdoc_ids_to_search` documents
        given `sdoc_ids_known` documents as labeled training data"""
        raise NotImplementedError

    def suggest(
        self,
        data_ids: Iterable[int] | Iterable[Tuple[int, int]],
        proj_id: int,
        top_k: int,
        index_type: IndexType,
    ) -> List[SimSearchSentenceHit]:
        raise NotImplementedError

    def get_embeddings(
        self,
        search_tuples: List[Tuple[int, int]],
        index_type: IndexType,
    ) -> np.ndarray:
        raise NotImplementedError

    def get_document_embedding_by_sdoc_id(self, sdoc_id: int) -> np.ndarray:
        raise NotImplementedError

    def get_sentence_embeddings_by_sdoc_id(self, sdoc_id: int) -> np.ndarray:
        raise NotImplementedError

    def get_image_embedding_by_sdoc_id(self, sdoc_id: int) -> np.ndarray:
        raise NotImplementedError

    def drop_indices(self) -> None:
        raise NotImplementedError
