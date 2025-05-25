from app.core.vector.collections.topic_collection import TopicCollection
from app.core.vector.crud.crud_base import CRUDBase
from app.core.vector.dto.topic_embedding import TopicObjectIdentifier
from app.core.vector.weaviate_service import WeaviateService


class CRUDTopicEmbedding(CRUDBase[TopicObjectIdentifier, TopicCollection]):
    """
    CRUD operations for topic embeddings in Weaviate
    """

    pass


client = WeaviateService().get_client()
crud_topic_embedding = CRUDTopicEmbedding(
    client=client,
    collection_class=TopicCollection,
    object_identifier=TopicObjectIdentifier,
)
