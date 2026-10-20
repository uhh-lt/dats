from weaviate import WeaviateClient
from weaviate.classes.query import Filter

from modules.perspectives.cluster_collection import ClusterCollection
from modules.perspectives.cluster_embedding_dto import ClusterObjectIdentifier
from repos.vector.embedding_crud_base import EmbeddingCRUDBase
from repos.vector.weaviate_models import EmbeddingSearchResult


class CRUDClusterEmbedding(
    EmbeddingCRUDBase[ClusterObjectIdentifier, ClusterCollection]
):
    """
    CRUD operations for cluster embeddings in Weaviate
    """

    ### CREATE OPERATIONS ###
    # Inherited from EmbeddingCRUDBase

    ### READ OPERATIONS ###

    def read_by_aspect_id(
        self, client: WeaviateClient, *, project_id: int, aspect_id: int
    ) -> list[EmbeddingSearchResult[ClusterObjectIdentifier]]:
        """
        Get all cluster embeddings of a certain Aspect
        Args:
            client: Weaviate client
            project_id: The project ID
            aspect_id: The Aspect ID to filter by
        Returns:
            List of EmbeddingSearchResult[ClusterObjectIdentifier]
        """
        return self.read_by_filters(
            client=client,
            project_id=project_id,
            filters=Filter.by_property(
                self.collection_class.properties["aspect_id"].name
            ).equal(aspect_id),
        )

    ### DELETE OPERATIONS ###

    def delete_by_aspect_id(
        self, client: WeaviateClient, *, project_id: int, aspect_id: int
    ) -> None:
        """
        Remove all cluster embeddings of a certain Aspect from Weaviate
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


crud_cluster_embedding = CRUDClusterEmbedding(
    collection_class=ClusterCollection,
    object_identifier=ClusterObjectIdentifier,
)
