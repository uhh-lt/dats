from typing import TypedDict

from weaviate.classes.config import DataType, Property

from repos.vector.collection_base import BaseCollection


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
