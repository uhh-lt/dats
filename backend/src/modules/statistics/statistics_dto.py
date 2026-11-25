from pydantic import BaseModel, Field

from core.tag.tag_dto import TagRead


class SpanEntity(BaseModel):
    code_id: int = Field(description="The ID of the Code related to the SpanAnnotation")
    span_text: str = Field(description="The SpanText the SpanAnnotation spans")


class SpanEntityStat(SpanEntity):
    filtered_count: int = Field(
        description="Number of occurrences of the SpanEntity in a collection of SourceDocuments."
    )
    global_count: int = Field(
        description="Number of occurrences of the SpanEntity in a collection of SourceDocuments."
    )


class TagStat(BaseModel):
    tag: TagRead = Field(description="The counted document tag.")
    filtered_count: int = Field(
        description="Number of occurrences of the document tag in the filtered documents"
    )
    global_count: int = Field(
        description="Number of occurrences of the document tag in all documents"
    )
