from typing import TypedDict

from app.core.vector.collections.base_collection import BaseCollection
from weaviate.classes.config import DataType, Property


class SentenceCollectionProperties(TypedDict):
    sdoc_id: Property
    sentence_id: Property


class SentenceCollection(BaseCollection):
    name = "Sentence"
    description = "Sentence vector collection"
    properties: SentenceCollectionProperties = {
        "sdoc_id": Property(name="sdoc_id", data_type=DataType.INT),
        "sentence_id": Property(name="sentence_id", data_type=DataType.INT),
    }
