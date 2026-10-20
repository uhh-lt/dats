from weaviate import WeaviateClient
from weaviate.classes.query import Filter

from modules.perspectives.aspect_collection import AspectCollection
from modules.perspectives.aspect_embedding_dto import AspectObjectIdentifier
from repos.vector.embedding_crud_base import EmbeddingCRUDBase
from repos.vector.weaviate_models import SimSearchResult
from systems.event_system.events import source_document_deleted


class CRUDAspectEmbedding(EmbeddingCRUDBase[AspectObjectIdentifier, AspectCollection]):
    """
    CRUD operations for document aspect embeddings in Weaviate
    """

    ### CREATE OPERATIONS ###
    # Inherited from EmbeddingCRUDBase

    ### READ OPERATIONS ###
    # Inherited from EmbeddingCRUDBase

    ### DELETE OPERATIONS ###

    def delete_by_aspect_id(
        self, client: WeaviateClient, *, project_id: int, aspect_id: int
    ) -> None:
        """
        Remove all aspect embeddings of a certain Aspect from Weaviate
        Args:
            client: Weaviate client
            project_id: The project ID
            aspect_id: The Aspect ID
        """
        collection = self._get_collection(client=client, project_id=project_id)
        if self._tenant_exists(client=client, project_id=project_id):
            collection.data.delete_many(
                where=Filter.by_property(
                    self.collection_class.properties["aspect_id"].name
                ).equal(aspect_id),
            )

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

    def search_near_vector_in_aspect(
        self,
        client: WeaviateClient,
        *,
        project_id: int,
        vector: list[float],
        aspect_id: int,
        k: int,
        threshold: float | None = None,
    ) -> list[SimSearchResult[AspectObjectIdentifier]]:
        """
        Search for aspect documents near a given vector in all embeddings of a specific aspect
        Args:
            client: Weaviate client
            project_id: The project ID
            vector: The vector to search for
            aspect_id: The Aspect ID to filter by
            k: The number of nearest neighbors to return
            threshold: The minimum similarity for a match
        Returns:
            List of SimSearchResult[AspectObjectIdentifier]
        """
        return self.search_near_vector(
            client=client,
            project_id=project_id,
            vector=vector,
            k=k,
            threshold=threshold,
            filters=Filter.by_property(
                self.collection_class.properties["aspect_id"].name
            ).equal(aspect_id),
        )


crud_aspect_embedding = CRUDAspectEmbedding(
    collection_class=AspectCollection,
    object_identifier=AspectObjectIdentifier,
)

# Handle events


@source_document_deleted.connect
def handle_source_document_deleted(sender, sdoc_id: int, project_id: int) -> None:
    from repos.vector.weaviate_repo import WeaviateRepo

    crud_aspect_embedding.delete_by_sdoc_id(
        client=WeaviateRepo().get_client(), project_id=project_id, sdoc_id=sdoc_id
    )
