from enum import Enum

from pydantic import BaseModel, Field

from core.annotation.bbox_annotation_dto import BBoxAnnotationRead
from core.annotation.sentence_annotation_dto import SentenceAnnotationRead
from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.code.code_dto import CodeRead


class AnnotationReviewType(str, Enum):
    SPAN = "span"
    SENTENCE = "sentence"
    BBOX = "bbox"


class AnnotationReviewAction(str, Enum):
    UPDATE_CURRENT = "update_current"
    REASSIGN = "reassign"
    DELETE = "delete"


class AnnotationReviewResolve(BaseModel):
    action: AnnotationReviewAction
    replacement_code_id: int | None = Field(default=None)


class AnnotationReviewBulkResolve(AnnotationReviewResolve):
    source_code_id: int = Field(
        description="Code snapshot used by affected annotations"
    )


class AnnotationReviewBulkResult(BaseModel):
    span: int
    sentence: int
    bbox: int


class AnnotationReviewItem(BaseModel):
    annotation_type: AnnotationReviewType
    annotation: SpanAnnotationRead | SentenceAnnotationRead | BBoxAnnotationRead
    assigned_code: CodeRead
    current_code: CodeRead | None


class PaginatedAnnotationReviews(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[AnnotationReviewItem]


class AnnotationReviewCounts(BaseModel):
    span: int
    sentence: int
    bbox: int
