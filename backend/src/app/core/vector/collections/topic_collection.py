from typing import TypedDict

from app.core.vector.collections.base_collection import BaseCollection
from weaviate.classes.config import DataType, Property


class TopicCollectionProperties(TypedDict):
    aspect_id: Property
    topic_id: Property


class TopicCollection(BaseCollection):
    name = "Topic"
    description = "Topic vector collection"
    properties: TopicCollectionProperties = {
        "aspect_id": Property(name="aspect_id", data_type=DataType.INT),
        "topic_id": Property(name="topic_id", data_type=DataType.INT),
    }
