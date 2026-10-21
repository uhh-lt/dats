from enum import Enum


class SearchEntityType(str, Enum):
    """The searchable entity a saved view is for.

    Each value maps to one column enum (`MemoColumns`, `SpanColumns`, ...). The
    value is stored in `SearchViewORM.entity_type` and used as the discriminator
    for the create/read/update unions below. Sdoc is deliberately omitted: it is
    ElasticSearch-backed and not part of the unified search flow yet.
    """

    MEMO = "memo"
    SPAN_ANNOTATION = "span_annotation"
    SENTENCE_ANNOTATION = "sentence_annotation"
    BBOX_ANNOTATION = "bbox_annotation"


class SearchViewLayout(str, Enum):
    TABLE = "table"
    LIST = "list"
    BOARD = "board"
    GALLERY = "gallery"
    FEED = "feed"
