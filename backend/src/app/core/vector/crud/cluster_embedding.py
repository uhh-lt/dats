from app.core.vector.collections.cluster_collection import ClusterCollection
from app.core.vector.crud.crud_base import CRUDBase
from app.core.vector.dto.cluster_embedding import ClusterObjectIdentifier
from weaviate import WeaviateClient
from weaviate.classes.query import Filter


class CRUDClusterEmbedding(CRUDBase[ClusterObjectIdentifier, ClusterCollection]):
    """
    CRUD operations for cluster embeddings in Weaviate
    """

    def remove_embeddings_by_aspect(
        self, client: WeaviateClient, project_id: int, aspect_id: int
    ) -> None:
        """
        Remove all cluster embeddings of a certain Aspect from Weaviate
        :param project_id: The project ID
        :param aspect_id: The Aspect ID
        """
        collection = self._get_collection(client=client, project_id=project_id)
        if self._tenant_exists(client=client, project_id=project_id):
            collection.data.delete_many(
                where=Filter.by_property(
                    self.collection_class.properties["aspect_id"].name
                ).equal(aspect_id),
            )

    def find_embeddings_by_aspect_id(
        self, client: WeaviateClient, project_id: int, aspect_id: int
    ):
        """
        Find embeddings by aspect ID.

        :param project_id: The project ID
        :param aspect_id: The Aspect ID to filter by
        """
        return self.find_embeddings_by_filters(
            client=client,
            project_id=project_id,
            filters=Filter.by_property(
                self.collection_class.properties["aspect_id"].name
            ).equal(aspect_id),
        )


crud_cluster_embedding = CRUDClusterEmbedding(
    collection_class=ClusterCollection,
    object_identifier=ClusterObjectIdentifier,
)
