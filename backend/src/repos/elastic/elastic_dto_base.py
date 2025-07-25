from typing import Optional

from pydantic import BaseModel, Field


class ElasticSearchModelBase(BaseModel):
    def get_id(self) -> int:
        """
        Returns the ID of the ElasticSearchObject as it is in the SQL DB.
        """
        raise NotImplementedError(
            "This method should be implemented in the subclass to return the ID."
        )


class ElasticSearchHit(BaseModel):
    id: int = Field(description="The ID of the Document")
    score: Optional[float] = Field(
        description="The score of the Document that was found by a ES Query",
        default=None,
    )
    highlights: list[str] = Field(
        description="The highlights found within the document.", default=[]
    )


class PaginatedElasticSearchHits(BaseModel):
    hits: list[ElasticSearchHit] = Field(
        description=(
            "The IDs, scores and (optional) highlights of Document search results on "
            "the requested page."
        )
    )
    total_results: int = Field(
        description="The total number of hits. Used for pagination."
    )
