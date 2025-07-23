from typing import TypedDict

from repos.vector.collection_base import BaseCollection
from weaviate.classes.config import DataType, Property


class DocuentCollectionProperties(TypedDict):
    sdoc_id: Property


class DocumentCollection(BaseCollection):
    name = "Document"
    description = "Document vector collection"
    properties: DocuentCollectionProperties = {
        "sdoc_id": Property(name="sdoc_id", data_type=DataType.INT),
    }
