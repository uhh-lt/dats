from pydantic import BaseModel, Field


class KeywordStat(BaseModel):
    keyword: str = Field(description="The counted keyword.")
    filtered_count: int = Field(
        description="Number of occurrences of the keyword in the filtered collection"
    )
    global_count: int = Field(
        description="Number of occurrences of the keyword in the entire collection"
    )
