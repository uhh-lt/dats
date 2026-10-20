from weaviate import WeaviateClient
from weaviate.classes.query import Filter

from core.doc.image_collection import ImageCollection
from core.doc.image_embedding_dto import ImageObjectIdentifier
from repos.vector.embedding_crud_base import EmbeddingCRUDBase
from repos.vector.weaviate_models import SimSearchResult
from systems.event_system.events import source_document_deleted


class CRUDImageEmbedding(EmbeddingCRUDBase[ImageObjectIdentifier, ImageCollection]):
    """
    CRUD operations for image embeddings in Weaviate
    """

    ### CREATE OPERATIONS ###
    # Inherited from EmbeddingCRUDBase

    ### READ OPERATIONS ###
    # Inherited from EmbeddingCRUDBase

    ### DELETE OPERATIONS ###

    def delete_by_sdoc_id(
        self, client: WeaviateClient, *, project_id: int, sdoc_id: int
    ) -> None:
        """
        Remove all embeddings for a given SourceDocument by sdoc_id
        Args:
            client: Weaviate client
            project_id: The project ID
            sdoc_id: The SourceDocument ID
        """
        collection = self._get_collection(client=client, project_id=project_id)
        if self._tenant_exists(client=client, project_id=project_id):
            collection.data.delete_many(
                where=Filter.by_property(
                    self.collection_class.properties["sdoc_id"].name
                ).equal(sdoc_id)
            )

    ### OTHER OPERATIONS ###

    def search_near_vector_in_sdoc_ids(
        self,
        client: WeaviateClient,
        *,
        project_id: int,
        vector: list[float],
        k: int,
        threshold: float,
        sdoc_ids: list[int] | None,
    ) -> list[SimSearchResult[ImageObjectIdentifier]]:
        """
        Search for images near a given vector in specific SourceDocument IDs
        Args:
            client: Weaviate client
            project_id: The project ID
            vector: The vector to search for
            k: The number of nearest neighbors to return
            threshold: The minimum similarity for a match
            sdoc_ids: List of SourceDocument IDs to filter by
        Returns:
            List of SimSearchResult[ImageObjectIdentifier]
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


crud_image_embedding = CRUDImageEmbedding(
    collection_class=ImageCollection,
    object_identifier=ImageObjectIdentifier,
)

# Handle events


@source_document_deleted.connect
def handle_source_document_deleted(sender, sdoc_id: int, project_id: int) -> None:
    from repos.vector.weaviate_repo import WeaviateRepo

    crud_image_embedding.delete_by_sdoc_id(
        client=WeaviateRepo().get_client(), project_id=project_id, sdoc_id=sdoc_id
    )
