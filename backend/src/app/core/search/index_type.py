from enum import Enum


class IndexType(str, Enum):
    SENTENCE = "sentence"
    IMAGE = "image"
    NAMED_ENTITY = "named-entity"
