from abc import ABC, abstractmethod
from typing import List, Tuple

import numpy as np

from app.core.data.dto.search import SimSearchSentenceHit
from app.core.search.index_type import IndexType
from app.util.singleton_meta import SingletonMeta


class VectorIndexService(ABC, metaclass=SingletonMeta):

    @abstractmethod
    def add_embeddings_to_index(
        self, type: IndexType, proj_id: int, sdoc_id: int, embeddings: List[np.ndarray]
    ):
        pass

    @abstractmethod
    def remove_embeddings_from_index(self, type: IndexType, sdoc_id: int):
        pass

    @abstractmethod
    def remove_project_from_index(self, proj_id: int):
        pass

    @abstractmethod
    def search_index(
        self,
        proj_id: int,
        index_type: IndexType,
        query_emb: np.ndarray,
        sdoc_ids_to_search: List[int],
        top_k: int = 10,
        threshold: float = 0.0,
    ) -> List[SimSearchSentenceHit]:
        pass

    @abstractmethod
    def suggest(
        self,
        index_type: IndexType,
        proj_id: int,
        sdoc_sent_ids: List[Tuple[int, int]],
    ) -> List[SimSearchSentenceHit]:
        pass
