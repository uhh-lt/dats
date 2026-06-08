from pydantic import BaseModel, Field

from core.annotation.span_annotation_dto import SpanAnnotationCreate


class SpanAnnotationHit(BaseModel):
    span_dto: SpanAnnotationCreate = Field(
        description="The DTO needed to create the SpanAnnotation."
    )
    before_context: str = Field(description="The context before the span.")
    after_context: str = Field(description="The context after the span.")


class PaginatedSpanAnnotationHits(BaseModel):
    total_results: int = Field(
        description="The total number of SpanAnnotation hits. Used for pagination."
    )
    hits: list[SpanAnnotationHit] = Field(
        description=("The SpanAnnotation hits matching the search query.")
    )
