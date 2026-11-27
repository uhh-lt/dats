from pydantic import BaseModel, Field


class KeywordStat(BaseModel):
    keyword: str = Field(description="The counted keyword.")
    filtered_count: int = Field(
        description="Number of occurrences of the keyword in the filtered collection"
    )
    global_count: int = Field(
        description="Number of occurrences of the keyword in the entire collection"
    )


class KeywordStatisticsRequest(BaseModel):
    sdoc_ids: list[int] = Field(description="The SourceDocuments to count in")
    sort_by_global: bool = Field(
        default=False, description="Sort by the count in the whole Project"
    )
    top_k: int = Field(default=20, description="Number of keywords to return")
