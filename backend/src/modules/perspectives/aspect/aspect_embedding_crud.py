from weaviate import WeaviateClient
from weaviate.classes.query import Filter

from modules.perspectives.aspect.aspect_collection import AspectCollection
from modules.perspectives.aspect.aspect_embedding_dto import AspectObjectIdentifier
from repos.vector.embedding_crud_base import CRUDBase
from systems.event_system.events import project_deleted, source_document_deleted


class CRUDAspectEmbedding(CRUDBase[AspectObjectIdentifier, AspectCollection]):
    """
    CRUD operations for document aspect embeddings in Weaviate
    """

    ### DELETE OPERATIONS ###

    def delete_embeddings_by_aspect(
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

    def delete_by_sdoc_id(
        self, client: WeaviateClient, project_id: int, sdoc_id: int
    ) -> None:
        """
        Remove all embeddings for a given SourceDocument by sdoc_id
        Args:
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
        project_id: int,
        vector: list[float],
        aspect_id: int,
        k: int,
        threshold: float | None = None,
    ):
        """
        Search for aspect documents near a given vector in all embeddings of a specific aspect
        Args:
            project_id: The project ID
            vector: The vector to search for
            k: The number of nearest neighbors to return
            threshold: The minimum distance for a match
            aspect_id: The Aspect ID to filter by
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
def handle_source_document_deleted(sender, sdoc_id: int, project_id: int):
    from repos.vector.weaviate_repo import WeaviateRepo

    with WeaviateRepo().weaviate_session() as client:
        crud_aspect_embedding.delete_by_sdoc_id(
            client=client, project_id=project_id, sdoc_id=sdoc_id
        )


@project_deleted.connect
def handle_project_deleted(sender, project_id: int):
    from repos.vector.weaviate_repo import WeaviateRepo

    with WeaviateRepo().weaviate_session() as client:
        crud_aspect_embedding.remove_embeddings_by_project(
            client=client, project_id=project_id
        )
