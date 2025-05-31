from typing import Optional

from app.core.vector.collections.document_collection import DocumentCollection
from app.core.vector.crud.crud_base import CRUDBase
from app.core.vector.dto.document_embedding import DocumentObjectIdentifier
from app.core.vector.weaviate_service import WeaviateService
from weaviate.classes.query import Filter


class CRUDDocumentEmbedding(CRUDBase[DocumentObjectIdentifier, DocumentCollection]):
    """
    CRUD operations for document embeddings in Weaviate
    """

    def search_near_sdoc(
        self,
        project_id: int,
        sdoc_id: int,
        k: int,
        threshold: float,
        sdoc_ids: Optional[list[int]] = None,
    ):
        """
        Search for documents near a SourceDocument
        Args:
            project_id: The project ID
            sdoc_id: The SourceDocument ID to search near
            k: The number of nearest neighbors to return
            threshold: The minimum distance for a match
            sdoc_ids: List of SourceDocument IDs to search in
        Returns:
            List of SimSearchResult[DocumentObjectIdentifier]
        """
        uuid = DocumentObjectIdentifier(sdoc_id=sdoc_id).uuidv5()
        filters = (
            Filter.by_property(
                self.collection_class.properties["sdoc_id"].name
            ).contains_any(sdoc_ids)
            if sdoc_ids
            else None
        )
        return self.search_near_object(
            project_id=project_id,
            uuid=uuid,
            filters=filters,
            k=k,
            threshold=threshold,
        )

    def remove_by_sdoc_id(self, project_id: int, sdoc_id: int) -> None:
        """
        Remove all embeddings for a given SourceDocument by sdoc_id
        Args:
            project_id: The project ID
            sdoc_id: The SourceDocument ID
        """
        collection = self._get_collection(project_id=project_id)
        collection.data.delete_many(
            where=Filter.by_property(
                self.collection_class.properties["sdoc_id"].name
            ).equal(sdoc_id)
        )


client = WeaviateService().get_client()
crud_document_embedding = CRUDDocumentEmbedding(
    client=client,
    collection_class=DocumentCollection,
    object_identifier=DocumentObjectIdentifier,
)
