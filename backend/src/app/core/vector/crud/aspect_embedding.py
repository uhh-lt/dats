from app.core.vector.collections.aspect_collection import AspectCollection
from app.core.vector.crud.crud_base import CRUDBase
from app.core.vector.dto.aspect_embedding import AspectObjectIdentifier
from app.core.vector.weaviate_service import WeaviateService
from weaviate.classes.query import Filter


class CRUDAspectEmbedding(CRUDBase[AspectObjectIdentifier, AspectCollection]):
    """
    CRUD operations for document aspect embeddings in Weaviate
    """

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
crud_aspect_embedding = CRUDAspectEmbedding(
    client=client,
    collection_class=AspectCollection,
    object_identifier=AspectObjectIdentifier,
)
