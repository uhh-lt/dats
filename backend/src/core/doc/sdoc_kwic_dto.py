from pydantic import BaseModel, Field


class KwicSnippet(BaseModel):
    left: str = Field(description="The text before the keyword.")
    keyword: str = Field(description="The matched keyword.")
    right: str = Field(description="The text after the keyword.")


class ElasticSearchKwicHit(BaseModel):
    id: int = Field(description="The ID of the Document.")
    filename: str = Field(description="The filename of the Document.")
    score: float | None = Field(
        description="The score of the Document from ES query.", default=None
    )
    snippets: list[KwicSnippet] = Field(
        description="The KWIC snippets for the matched keyword(s).", default=[]
    )


class PaginatedElasticSearchKwicHits(BaseModel):
    hits: list[ElasticSearchKwicHit] = Field(
        description="The KWIC search results for the requested page."
    )
    total_results: int = Field(
        description="The total number of KWIC hits. Used for pagination."
    )
