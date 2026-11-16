from weaviate import WeaviateClient
from weaviate.classes.query import Filter

from modules.tag_recommendation.document_collection import DocumentCollection
from modules.tag_recommendation.document_embedding_dto import DocumentObjectIdentifier
from repos.vector.embedding_crud_base import EmbeddingCRUDBase
from repos.vector.weaviate_models import SimSearchResult


class CRUDDocumentEmbedding(
    EmbeddingCRUDBase[DocumentObjectIdentifier, DocumentCollection]
):
    """
    CRUD operations for document embeddings in Weaviate
    """

    ### CREATE OPERATIONS ###
    # Inherited from EmbeddingCRUDBase

    ### READ OPERATIONS ###
    # Inherited from EmbeddingCRUDBase

    ### DELETE OPERATIONS ###
    # Inherited from EmbeddingCRUDBase

    ### OTHER OPERATIONS ###

    def search_near_sdoc(
        self,
        client: WeaviateClient,
        *,
        project_id: int,
        sdoc_id: int,
        k: int,
        threshold: float,
        sdoc_ids: list[int] | None = None,
    ) -> list[SimSearchResult[DocumentObjectIdentifier]]:
        """
        Search for documents near a SourceDocument
        Args:
            client: Weaviate client
            project_id: The project ID
            sdoc_id: The SourceDocument ID to search near
            k: The number of nearest neighbors to return
            threshold: The minimum similarity for a match
            sdoc_ids: The SourceDocument IDs to search in; None searches all,
                an empty list finds nothing
        Returns:
            List of SimSearchResult[DocumentObjectIdentifier]
        """
        if sdoc_ids is not None and len(sdoc_ids) == 0:
            return []
        filters = (
            Filter.by_property(
                self.collection_class.properties["sdoc_id"].name
            ).contains_any(sdoc_ids)
            if sdoc_ids is not None
            else None
        )
        return self.search_near_object(
            client=client,
            project_id=project_id,
            id=DocumentObjectIdentifier(sdoc_id=sdoc_id),
            filters=filters,
            k=k,
            threshold=threshold,
        )


crud_document_embedding = CRUDDocumentEmbedding(
    collection_class=DocumentCollection,
    object_identifier=DocumentObjectIdentifier,
)
