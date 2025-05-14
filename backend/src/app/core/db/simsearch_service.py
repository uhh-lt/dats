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
from config import conf
from loguru import logger

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.doc_type import DocType
from app.core.data.dto.search import (
    SimSearchDocumentHit,
    SimSearchImageHit,
    SimSearchSentenceHit,
)
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.llm.ollama_service import OllamaService
from app.core.data.repo.repo_service import RepoService
from app.core.data.repo.utils import image_to_base64, load_image
from app.core.db.index_type import IndexType
from app.core.db.sql_service import SQLService
from app.core.db.vector_index_service import VectorIndexService
from app.core.db.weaviate_service import WeaviateVectorLengthError
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.clip import (
    ClipImageEmbeddingInput,
    ClipTextEmbeddingInput,
)
from app.util.singleton_meta import SingletonMeta

SimSearchHit = TypeVar("SimSearchHit")


class SimSearchService(metaclass=SingletonMeta):
    def __new__(cls, reset_vector_index=False):
        index_name: str = conf.vector_index.service
        match index_name:
            case "qdrant":
                # import and init QdrantService
                from app.core.db.qdrant_service import QdrantService

                cls._index: VectorIndexService = QdrantService(flush=reset_vector_index)
            case "typesense":
                # import and init TypesenseService
                from app.core.db.typesense_service import TypesenseService

                cls._index: VectorIndexService = TypesenseService(
                    flush=reset_vector_index
                )
            case "weaviate":
                # import and init WeaviateService
                from app.core.db.weaviate_service import WeaviateService

                cls._index: VectorIndexService = WeaviateService(
                    flush=reset_vector_index
                )
            case _:
                msg = (
                    f"VECTOR_INDEX environment variable not correctly set: {index_name}"
                )
                logger.error(msg)
                raise SystemExit(msg)

        cls.rms = RayModelService()
        cls.repo = RepoService()
        cls.sqls = SQLService()
        cls.llm = OllamaService()
        return super(SimSearchService, cls).__new__(cls)

    def _encode_document(self, text: str) -> np.ndarray:
        doc_emb = self.llm.llm_embed([text])
        return doc_emb

    def _encode_sentences(self, sentences: List[str]) -> np.ndarray:
        encoded_query = self.rms.clip_text_embedding(
            ClipTextEmbeddingInput(text=sentences)
        )
        if len(encoded_query.embeddings) == 1:
            return encoded_query.numpy().squeeze()
        else:
            return encoded_query.numpy()

    def _get_image_name_from_sdoc_id(self, sdoc_id: int) -> SourceDocumentRead:
        with self.sqls.db_session() as db:
            sdoc = SourceDocumentRead.model_validate(crud_sdoc.read(db=db, id=sdoc_id))
            assert sdoc.doctype == DocType.image, (
                f"SourceDocument with {sdoc_id=} is not an image!"
            )
        return sdoc

    def _encode_image(self, image_sdoc_id: int) -> np.ndarray:
        image_sdoc = self._get_image_name_from_sdoc_id(sdoc_id=image_sdoc_id)
        image_fp = self.repo.get_path_to_sdoc_file(image_sdoc, raise_if_not_exists=True)
        image = load_image(image_fp)
        base64_image = image_to_base64(image)

        encoded_query = self.rms.clip_image_embedding(
            ClipImageEmbeddingInput(
                base64_images=[base64_image],
            )
        )
        return encoded_query.numpy().squeeze()

    def add_text_sdoc_to_index(
        self,
        proj_id: int,
        sdoc_id: int,
        sentences: List[str],
    ) -> None:
        sentence_embs = self.rms.clip_text_embedding(
            ClipTextEmbeddingInput(text=sentences)
        )
        if len(sentence_embs.embeddings) != len(sentences):
            raise ValueError(
                f"Embedding/Sentence mismatch for sdoc {sdoc_id}! Input: {len(sentences)} sentences, Output: {len(sentence_embs.embeddings)} embeddings"
            )
        sentence_embs = sentence_embs.numpy()

        logger.debug(
            f"Adding {len(sentence_embs)} sentences "
            f"from SDoc {sdoc_id} in Project {proj_id} to Weaviate ..."
        )
        self._index.add_embeddings_to_index(
            IndexType.SENTENCE,
            proj_id,
            [sdoc_id] * len(sentence_embs),
            sentence_embs,
        )

    def add_document_embeddings(
        self,
        proj_id: int,
        sdoc_ids: List[int],
        embeddings: np.ndarray,
        force: bool = False,
    ):
        try:
            self._index.add_embeddings_to_index(
                IndexType.DOCUMENT, proj_id, sdoc_ids, embeddings
            )
        except WeaviateVectorLengthError as e:
            if force:
                self.remove_all_document_embeddings(proj_id)
                self._index.add_embeddings_to_index(
                    IndexType.DOCUMENT, proj_id, sdoc_ids, embeddings
                )
            else:
                raise e

    def remove_all_document_embeddings(self, proj_id):
        self._index.remove_project_index(proj_id, IndexType.DOCUMENT)

    def add_image_sdoc_to_index(self, proj_id: int, sdoc_id: int) -> None:
        image_emb = self._encode_image(image_sdoc_id=sdoc_id)
        logger.debug(
            f"Adding image SDoc {sdoc_id} in Project {proj_id} to Weaviate ..."
        )
        self._index.add_embeddings_to_index(
            IndexType.IMAGE, proj_id, [sdoc_id], [image_emb]
        )

    def remove_sdoc_from_index(self, doctype: str, sdoc_id: int):
        match doctype:
            case DocType.text:
                self.remove_text_sdoc_from_index(sdoc_id)
            case DocType.image:
                self.remove_image_sdoc_from_index(sdoc_id)
            case _:
                # Other doctypes are not used for simsearch
                pass

    def remove_image_sdoc_from_index(self, sdoc_id: int) -> None:
        logger.debug(f"Removing image SDoc {sdoc_id} from Index!")
        self._index.remove_embeddings_from_index(IndexType.IMAGE, sdoc_id)

    def remove_text_sdoc_from_index(self, sdoc_id: int) -> None:
        logger.debug(f"Removing text SDoc {sdoc_id} from Index!")
        self._index.remove_embeddings_from_index(IndexType.SENTENCE, sdoc_id)
        self._index.remove_embeddings_from_index(IndexType.DOCUMENT, sdoc_id)

    def remove_all_project_embeddings(
        self,
        proj_id: int,
    ) -> None:
        self._index.remove_project_from_index(proj_id)

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
                self._encode_document(" ".join(text_query))
                if document_query
                else self._encode_sentences(sentences=text_query)
            )
        elif image_query_id is not None:
            query_emb = self._encode_image(image_sdoc_id=image_query_id)
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
        return self._index.search_index(
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
        return self._index.knn(proj_id, IndexType.DOCUMENT, classify, gold, k)

    def suggest_similar_sentences(
        self,
        proj_id: int,
        pos_sdoc_sent_ids: List[Tuple[int, int]],
        neg_sdoc_sent_ids: List[Tuple[int, int]],
        top_k: int,
    ) -> List[SimSearchSentenceHit]:
        hits = self._index.suggest(
            pos_sdoc_sent_ids, proj_id, top_k, IndexType.SENTENCE
        )
        marked_sdoc_sent_ids = {
            entry for entry in pos_sdoc_sent_ids + neg_sdoc_sent_ids
        }
        hits = [
            h for h in hits if (h.sdoc_id, h.sentence_id) not in marked_sdoc_sent_ids
        ]
        hits.sort(key=lambda x: (x.sdoc_id, x.sentence_id))
        hits = self.__unique_consecutive(hits, key=lambda x: (x.sdoc_id, x.sentence_id))
        candidates = [(h.sdoc_id, h.sentence_id) for h in hits]
        nearest = self._index.suggest(
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
        hits = self._index.suggest(pos_sdoc_ids, proj_id, top_k, IndexType.DOCUMENT)
        hits = [h for h in hits if h.sdoc_id not in marked_sdoc_ids]
        hits.sort(key=lambda x: (x.sdoc_id, -x.score))
        if unique:
            hits = self.__unique_consecutive(
                hits, key=lambda x: (x.sdoc_id, x.compared_sdoc_id)
            )
        if len(neg_sdoc_ids) > 0:
            candidates = {h.sdoc_id for h in hits}
            nearest = self._index.suggest(
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

    def get_sentence_embeddings(
        self, search_tuples: List[Tuple[int, int]]
    ) -> np.ndarray:
        return self._index.get_sentence_embeddings(search_tuples)

    def drop_indices(self) -> None:
        logger.warning("Dropping all sim search indices!")
        self._index.drop_indices()
