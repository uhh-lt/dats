from pydantic import BaseModel, Field

from core.search.sdoc_search.sdoc_search_columns import SdocColumns
from systems.search_system.filtering import Filter


class SimSearchHit(BaseModel):
    sdoc_id: int = Field(
        description="The ID of the SourceDocument similar to the query."
    )
    score: float = Field(description="The similarity score.")


class SimSearchSentenceHit(SimSearchHit):
    sentence_id: int = Field(
        description="The sentence id with respect to the SourceDocument"
    )


class SimSearchImageHit(SimSearchHit):
    pass


class SimSearchRequest(BaseModel):
    query: str | int = Field(
        description="A text, or the ID of a SourceDocument (image) or sentence to compare to"
    )
    top_k: int = Field(description="Number of hits to return")
    threshold: float = Field(description="Minimum similarity of a hit")
    filter: Filter[SdocColumns] = Field(
        description="Filter on the SourceDocuments to search in"
    )
