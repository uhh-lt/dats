from enum import StrEnum


class IndexType(StrEnum):
    SENTENCE = "sentence"
    IMAGE = "image"
    NAMED_ENTITY = "named-entity"
    DOCUMENT = "document"
