from weaviate import WeaviateClient
from weaviate.classes.query import Filter

from core.doc.sentence_collection import SentenceCollection
from core.doc.sentence_embedding_dto import SentenceObjectIdentifier
from repos.vector.embedding_crud_base import EmbeddingCRUDBase
from repos.vector.weaviate_models import EmbeddingSearchResult, SimSearchResult


class CRUDSentenceEmbedding(
    EmbeddingCRUDBase[SentenceObjectIdentifier, SentenceCollection]
):
    """
    CRUD operations for sentence embeddings in Weaviate
    """

    ### CREATE OPERATIONS ###
    # Inherited from EmbeddingCRUDBase

    ### READ OPERATIONS ###

    def read_by_sdoc_id(
        self, client: WeaviateClient, *, project_id: int, sdoc_id: int
    ) -> list[EmbeddingSearchResult[SentenceObjectIdentifier]]:
        """
        Get all sentence embeddings for a given SourceDocument by sdoc_id
        Args:
            client: Weaviate client
            project_id: The project ID
            sdoc_id: The SourceDocument ID
        Returns:
            List of EmbeddingSearchResult[SentenceObjectIdentifier]
        """
        return self.read_by_filters(
            client=client,
            project_id=project_id,
            filters=Filter.by_property(
                self.collection_class.properties["sdoc_id"].name
            ).equal(sdoc_id),
        )

    ### DELETE OPERATIONS ###
    # Inherited from EmbeddingCRUDBase

    ### OTHER OPERATIONS ###

    def search_near_sentence(
        self,
        client: WeaviateClient,
        *,
        project_id: int,
        id: SentenceObjectIdentifier,
        k: int,
        threshold: float,
    ) -> list[SimSearchResult[SentenceObjectIdentifier]]:
        """
        Search for sentences near a given sentence
        Args:
            client: Weaviate client
            project_id: The project ID
            id: The identifier of the sentence to search near
            k: The number of nearest neighbors to return
            threshold: The minimum similarity for a match
        Returns:
            List of SimSearchResult[SentenceObjectIdentifier]
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
        *,
        project_id: int,
        vector: list[float],
        k: int,
        threshold: float,
        sdoc_ids: list[int] | None,
    ) -> list[SimSearchResult[SentenceObjectIdentifier]]:
        """
        Search for sentences near a given vector in specific SourceDocument IDs
        Args:
            client: Weaviate client
            project_id: The project ID
            vector: The vector to search for
            k: The number of nearest neighbors to return
            threshold: The minimum similarity for a match
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


crud_sentence_embedding = CRUDSentenceEmbedding(
    collection_class=SentenceCollection,
    object_identifier=SentenceObjectIdentifier,
)
