from weaviate import WeaviateClient
from weaviate.classes.query import Filter

from core.doc.document_collection import DocumentCollection
from core.doc.document_embedding_dto import DocumentObjectIdentifier
from repos.vector.embedding_crud_base import EmbeddingCRUDBase
from repos.vector.weaviate_models import SimSearchResult
from systems.event_system.events import source_document_deleted


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
            sdoc_ids: List of SourceDocument IDs to search in
        Returns:
            List of SimSearchResult[DocumentObjectIdentifier]
        """
        filters = (
            Filter.by_property(
                self.collection_class.properties["sdoc_id"].name
            ).contains_any(sdoc_ids)
            if sdoc_ids
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

# Handle events


@source_document_deleted.connect
def handle_source_document_deleted(sender, sdoc_id: int, project_id: int) -> None:
    from repos.vector.weaviate_repo import WeaviateRepo

    crud_document_embedding.delete_by_sdoc_id(
        client=WeaviateRepo().get_client(), project_id=project_id, sdoc_id=sdoc_id
    )
