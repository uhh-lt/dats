from pydantic import BaseModel, Field


class PaginatedResults(BaseModel):
    has_more: bool = Field(description="Flag that indicates whether there are more search results.")
    total: int = Field(description="The total number of results.")
    current_page_offset: int = Field(description="The offset that returns the current results.")
    next_page_offset: int = Field(description="The offset that returns the next results.")
