from typing import TypedDict

from weaviate.classes.config import DataType, Property

from repos.vector.collection_base import BaseCollection


class ImageCollectionProperties(TypedDict):
    sdoc_id: Property


class ImageCollection(BaseCollection):
    name = "Image"
    description = "Image vector collection"
    properties: ImageCollectionProperties = {
        "sdoc_id": Property(name="sdoc_id", data_type=DataType.INT),
    }
