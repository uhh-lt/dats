from typing import TypedDict

from weaviate.classes.config import DataType, Property

from repos.vector.collection_base import BaseCollection


class AspectCollectionProperties(TypedDict):
    aspect_id: Property
    sdoc_id: Property


class AspectCollection(BaseCollection):
    name = "Aspect"
    description = "Aspect vector collection"
    properties: AspectCollectionProperties = {
        "aspect_id": Property(name="aspect_id", data_type=DataType.INT),
        "sdoc_id": Property(name="sdoc_id", data_type=DataType.INT),
    }
