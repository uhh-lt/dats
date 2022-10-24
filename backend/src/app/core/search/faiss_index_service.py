from pathlib import Path
from typing import Dict, Tuple, List

import faiss
import numpy as np
from faiss.swigfaiss import IndexIDMap
from loguru import logger

from app.core.data.repo.repo_service import RepoService
from app.core.search.index_type import IndexType
from app.util.singleton_meta import SingletonMeta
from config import conf


class FaissIndexDoesNotExistError(Exception):
    def __init__(self, proj_id: int, index_type: IndexType):
        super().__init__(f"There exists no FAISS Index of type {index_type} for Project {proj_id}")


class FaissIndexEmptyError(Exception):
    def __init__(self, proj_id: int, index_type: IndexType):
        super().__init__(f"The FAISS Index of type {index_type} for Project {proj_id} is empty!")


# TODO Flo: handle race conditions for celery multi process
#  Implement in a similar fashion as the startup with a lockfile on disk shared across the processes.
#  Didn't implement now because it requires special celery-based load balancing. Otherwise it could be that a single
#  insert or remove could cause all processes to reload the entire index file.
class FaissIndexService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.repo = RepoService()
        cls._text_index_prefix = 'text'
        cls._image_index_prefix = 'image'
        cls._index_suffix = '.faiss'
        cls._index_factory_string = conf.faiss.index_factory_string
        cls._index_dimension = conf.faiss.index_dimension

        if "IP" in conf.faiss.index_search_metric:
            cls._index_search_metric = faiss.METRIC_INNER_PRODUCT
        else:
            cls._index_search_metric = faiss.METRIC_L2

        cls._device = conf.faiss.device

        cls._index_in_memory_cache: Dict[Tuple[int, str], IndexIDMap] = dict()

        return super(FaissIndexService, cls).__new__(cls)

    def _get_indices_director_for_project(self, proj_id: int) -> Path:
        proj_root = self.repo.get_project_repo_root_path(proj_id=proj_id)
        return proj_root.joinpath("simsearch/indices")

    def _get_index_path_for_project(self, proj_id: int, index_type: IndexType) -> Path:
        if index_type == IndexType.TEXT:
            index_name = self._text_index_prefix + self._index_suffix
        elif index_type == IndexType.IMAGE:
            index_name = self._image_index_prefix + self._index_suffix
        else:
            raise NotImplementedError(f"Only text or image are allowed as index types!")

        return self._get_indices_director_for_project(proj_id=proj_id).joinpath(index_name)

    def __create_index(self) -> IndexIDMap:
        return faiss.index_factory(self._index_dimension, self._index_factory_string, self._index_search_metric)

    def __persist_index(self, index: IndexIDMap, proj_id: int, index_type: IndexType):
        index_fn = self._get_index_path_for_project(proj_id=proj_id, index_type=index_type)
        logger.debug(f"Persisting {index_type} index for Project {proj_id} at {index_fn}...")
        if not index_fn.exists():
            if not index_fn.parent.exists():
                index_fn.parent.mkdir(parents=True, exist_ok=False)
        faiss.write_index(index, str(index_fn))
        logger.debug(f"Persisted {index_type} index for Project {proj_id} at {index_fn}!")

    def index_exists(self, proj_id: int, index_type: IndexType) -> bool:
        return self._get_index_path_for_project(proj_id=proj_id, index_type=index_type).exists()

    def add_to_index(self, embeddings: np.ndarray, embedding_ids: np.ndarray, proj_id: int,
                     index_type: IndexType) -> None:
        logger.debug(f"Adding {len(embeddings)} embeddings to {index_type} index of Project {proj_id}!")
        if not len(embeddings) == len(embedding_ids):
            # TODO Flo: proper exception
            raise ValueError

        index = self.create_or_load_index_for_project(proj_id=proj_id, index_type=index_type)

        # noinspection PyArgumentList
        index.add_with_ids(embeddings, embedding_ids)
        logger.debug(f"Added {len(embeddings)} embeddings to {index_type} index of Project {proj_id}!")
        self.__persist_index(index=index, proj_id=proj_id, index_type=index_type)

    def remove_from_index(self, embedding_ids: np.ndarray, proj_id: int, index_type: IndexType) -> None:
        logger.debug(f"Removing {len(embedding_ids)} embeddings to {index_type} index of Project {proj_id}!")
        index = self.create_or_load_index_for_project(proj_id=proj_id, index_type=index_type)

        # noinspection PyArgumentList
        index.remove_ids(embedding_ids)
        logger.debug(f"Removed {len(embedding_ids)} embeddings to {index_type} index of Project {proj_id}!")
        self.__persist_index(index=index, proj_id=proj_id, index_type=index_type)

    def create_or_load_index_for_project(self, proj_id: int, index_type: IndexType) -> IndexIDMap:
        index = self._index_in_memory_cache.get((proj_id, index_type), None)
        if index is not None:
            logger.debug(f"Returning {index_type} index for Project {proj_id} from memory!")
            return index

        index_fn = self._get_index_path_for_project(proj_id=proj_id, index_type=index_type)
        if not index_fn.exists():
            if not index_fn.parent.exists():
                index_fn.parent.mkdir(parents=True, exist_ok=False)
            logger.debug(f"Creating {index_type} index for Project {proj_id} at {index_fn}!")
            index = self.__create_index()
            faiss.write_index(index, str(index_fn))
        else:
            logger.debug(f"Loading {index_type} index for Project {proj_id} from {index_fn} in memory!")
            index = faiss.read_index(str(index_fn))

        self._index_in_memory_cache[(proj_id, index_type)] = index

        return index

    def search_index(self,
                     proj_id: int,
                     index_type: IndexType,
                     query: np.ndarray,
                     top_k: int = 10) -> List[int]:
        if query.ndim == 1:
            query = query[np.newaxis]
        if not self.index_exists(proj_id=proj_id, index_type=index_type):
            logger.error(f"{index_type} Index for Project {proj_id} does not exist!")
            raise FaissIndexDoesNotExistError(proj_id=proj_id, index_type=index_type)

        # load or create the index
        index = self.create_or_load_index_for_project(proj_id=proj_id, index_type=index_type)

        if index.ntotal <= 0:
            logger.error(f"{index_type} Index for Project {proj_id} is empty!")
            raise FaissIndexEmptyError(proj_id=proj_id, index_type=index_type)

        # noinspection PyArgumentList
        dists, ids = index.search(query, top_k)
        ids: np.ndarray(dtype=int, shape=(1,)) = ids.squeeze()

        return ids.tolist()
