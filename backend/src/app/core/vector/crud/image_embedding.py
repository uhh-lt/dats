from typing import Optional

from app.core.vector.collections.image_collection import ImageCollection
from app.core.vector.crud.crud_base import CRUDBase
from app.core.vector.dto.image_embedding import ImageObjectIdentifier
from app.core.vector.weaviate_service import WeaviateService
from weaviate.classes.query import Filter


class CRUDImageEmbedding(CRUDBase[ImageObjectIdentifier, ImageCollection]):
    """
    CRUD operations for image embeddings in Weaviate
    """

    def search_near_vector_in_sdoc_ids(
        self,
        project_id: int,
        vector: list[float],
        k: int,
        threshold: float,
        sdoc_ids: Optional[list[int]],
    ):
        """
        Search for images near a given vector in specific SourceDocument IDs
        Args:
            project_id: The project ID
            vector: The vector to search for
            k: The number of nearest neighbors to return
            threshold: The minimum distance for a match
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
            project_id=project_id,
            filters=filters,
            vector=vector,
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
crud_image_embedding = CRUDImageEmbedding(
    client=client,
    collection_class=ImageCollection,
    object_identifier=ImageObjectIdentifier,
)
