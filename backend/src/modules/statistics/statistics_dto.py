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


class KeywordStat(BaseModel):
    keyword: str = Field(description="The counted keyword.")
    filtered_count: int = Field(
        description="Number of occurrences of the keyword in the filtered collection"
    )
    global_count: int = Field(
        description="Number of occurrences of the keyword in the entire collection"
    )


class TagStat(BaseModel):
    tag: TagRead = Field(description="The counted document tag.")
    filtered_count: int = Field(
        description="Number of occurrences of the document tag in the filtered documents"
    )
    global_count: int = Field(
        description="Number of occurrences of the document tag in all documents"
    )


class SpanEntityStatsQueryParameters(BaseModel):
    proj_id: int = Field(
        description="The ID of the Project the SourceDocuments have to belong to."
    )
    sdoc_ids: set[int] = Field(
        description="List of IDs of SourceDocuments the stats are computed for."
    )


class TagStatsQueryParameters(BaseModel):
    sdoc_ids: set[int] = Field(
        description="List of IDs of SourceDocuments the stats are computed for."
    )
