from typing import TypedDict

from app.core.vector.collections.base_collection import BaseCollection
from weaviate.classes.config import DataType, Property


class ImageCollectionProperties(TypedDict):
    sdoc_id: Property


class ImageCollection(BaseCollection):
    name = "Image"
    description = "Image vector collection"
    properties: ImageCollectionProperties = {
        "sdoc_id": Property(name="sdoc_id", data_type=DataType.INT),
    }
