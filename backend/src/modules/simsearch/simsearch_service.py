import numpy as np
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.singleton_meta import SingletonMeta
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentRead
from modules.search.sdoc_search.sdoc_search import filter_sdoc_ids
from modules.search.sdoc_search.sdoc_search_columns import SdocColumns
from modules.simsearch.image_embedding_crud import crud_image_embedding
from modules.simsearch.image_embedding_utils import encode_image
from modules.simsearch.simsearch_dto import SimSearchImageHit, SimSearchSentenceHit
from modules.simsearch.simsearch_exceptions import QueryDocumentNotAnImageError
from repos.ray.dto.clip import ClipTextEmbeddingInput
from repos.ray.ray_repo import RayRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.search_system.filtering import Filter


class SimSearchService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.ray = RayRepo()
        cls.weaviate = WeaviateRepo()
        return super(SimSearchService, cls).__new__(cls)

    def _encode_query(self, db: Session, query: str | int) -> np.ndarray:
        """The CLIP embedding of the query: the image of a document id (an int or
        a string of digits), else the text."""
        if isinstance(query, int) or query.isdigit():
            sdoc = SourceDocumentRead.model_validate(
                crud_sdoc.read(db=db, id=int(query))
            )
            if sdoc.doctype != DocType.image:
                raise QueryDocumentNotAnImageError(sdoc.id)
            return encode_image(sdoc)
        return self.ray.clip_text_embedding(
            ClipTextEmbeddingInput(text=[query])
        ).numpy()[0]

    def find_similar_sentences(
        self,
        db: Session,
        project_id: int,
        query: str | int,
        top_k: int,
        threshold: float,
        sdoc_ids_to_search: list[int] | None = None,
    ) -> list[SimSearchSentenceHit]:
        query_emb = self._encode_query(db=db, query=query).tolist()

        results = crud_sentence_embedding.search_near_vector_in_sdoc_ids(
            client=self.weaviate.get_client(),
            vector=query_emb,
            project_id=project_id,
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
        db: Session,
        project_id: int,
        query: str | int,
        top_k: int,
        threshold: float,
        filter: Filter[SdocColumns],
    ) -> list[SimSearchSentenceHit]:
        filtered_sdoc_ids, _ = filter_sdoc_ids(
            db=db, project_id=project_id, folder_id=None, filter=filter
        )

        return SimSearchService().find_similar_sentences(
            db=db,
            sdoc_ids_to_search=filtered_sdoc_ids,
            project_id=project_id,
            query=query,
            top_k=top_k,
            threshold=threshold,
        )

    def find_similar_images(
        self,
        db: Session,
        sdoc_ids_to_search: list[int],
        project_id: int,
        query: str | int,
        top_k: int,
        threshold: float,
    ) -> list[SimSearchImageHit]:
        query_emb = self._encode_query(db=db, query=query).tolist()

        results = crud_image_embedding.search_near_vector_in_sdoc_ids(
            client=self.weaviate.get_client(),
            vector=query_emb,
            project_id=project_id,
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
        db: Session,
        project_id: int,
        query: str | int,
        top_k: int,
        threshold: float,
        filter: Filter[SdocColumns],
    ) -> list[SimSearchImageHit]:
        filtered_sdoc_ids, _ = filter_sdoc_ids(
            db=db, project_id=project_id, folder_id=None, filter=filter
        )

        return SimSearchService().find_similar_images(
            db=db,
            sdoc_ids_to_search=filtered_sdoc_ids,
            project_id=project_id,
            query=query,
            top_k=top_k,
            threshold=threshold,
        )
