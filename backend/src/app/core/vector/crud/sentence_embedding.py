from typing import List, Optional

from app.core.vector.collections.sentence_collection import SentenceCollection
from app.core.vector.crud.crud_base import CRUDBase
from app.core.vector.dto.search_results import EmbeddingSearchResult
from app.core.vector.dto.sentence_embedding import (
    SentenceObjectIdentifier,
)
from weaviate import WeaviateClient
from weaviate.classes.query import Filter


class CRUDSentenceEmbedding(CRUDBase[SentenceObjectIdentifier, SentenceCollection]):
    """
    CRUD operations for sentence embeddings in Weaviate
    """

    def search_near_sentence(
        self,
        client: WeaviateClient,
        project_id: int,
        id: SentenceObjectIdentifier,
        k: int,
        threshold: float,
    ):
        """
        Search for documents near a SourceDocument
        Args:
            project_id: The project ID
            sdoc_id: The SourceDocument ID to search near
            k: The number of nearest neighbors to return
            threshold: The minimum distance for a match
        Returns:
            List of SimSearchResult[DocumentObjectIdentifier]
        """
        return self.search_near_object(
            client=client,
            project_id=project_id,
            id=id,
            k=k,
            threshold=threshold,
        )

    def search_near_vector_in_sdoc_ids(
        self,
        client: WeaviateClient,
        project_id: int,
        vector: list[float],
        k: int,
        threshold: float,
        sdoc_ids: Optional[list[int]],
    ):
        """
        Search for sentences near a given vector in specific SourceDocument IDs
        Args:
            project_id: The project ID
            vector: The vector to search for
            k: The number of nearest neighbors to return
            threshold: The minimum distance for a match
            sdoc_ids: List of SourceDocument IDs to search in if provided
        Returns:
            List of SimSearchResult[SentenceObjectIdentifier]
        """

        filters = (
            Filter.by_property(
                self.collection_class.properties["sdoc_id"].name
            ).contains_any(sdoc_ids)
            if sdoc_ids
            else None
        )
        return self.search_near_vector(
            client=client,
            project_id=project_id,
            filters=filters,
            vector=vector,
            k=k,
            threshold=threshold,
        )

    def get_embeddings_by_sdoc_id(
        self, client: WeaviateClient, project_id: int, sdoc_id: int
    ) -> List[EmbeddingSearchResult[SentenceObjectIdentifier]]:
        """
        Get all sentence embeddings for a given SourceDocument by sdoc_id
        Args:
            project_id: The project ID
            sdoc_id: The SourceDocument ID
        Returns:
            List of SentenceObjectIdentifier
        """
        return self.find_embeddings_by_filters(
            client=client,
            project_id=project_id,
            filters=Filter.by_property(
                self.collection_class.properties["sdoc_id"].name
            ).equal(sdoc_id),
        )

    def remove_by_sdoc_id(
        self, client: WeaviateClient, project_id: int, sdoc_id: int
    ) -> None:
        """
        Remove all embeddings for a given SourceDocument by sdoc_id
        Args:
            project_id: The project ID
            sdoc_id: The SourceDocument ID
        """
        collection = self._get_collection(client=client, project_id=project_id)
        collection.data.delete_many(
            where=Filter.by_property(
                self.collection_class.properties["sdoc_id"].name
            ).equal(sdoc_id)
        )


crud_sentence_embedding = CRUDSentenceEmbedding(
    collection_class=SentenceCollection,
    object_identifier=SentenceObjectIdentifier,
)
