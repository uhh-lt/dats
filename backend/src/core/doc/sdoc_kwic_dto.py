from enum import Enum

from pydantic import BaseModel, Field


class Ngrams(Enum):
    UNIGRAM = "1"
    BIGRAM = "2"
    TRIGRAM = "3"


class Direction(Enum):
    LEFT = "left"
    RIGHT = "right"


# TODO define ENUM here and use it in the endpoint ngram
# TODO use enum for direction in kwic analysis
class KwicSnippet(BaseModel):
    filename: str = Field(description="The filename of the Document.", default="")
    left: list[str] = Field(description="The text before the keyword.")
    keyword: str = Field(description="The matched keyword.")
    right: list[str] = Field(description="The text after the keyword.")


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


class PaginatedElasticSearchKwicSnippets(BaseModel):
    total_results: int = Field(
        description="The total number of KWIC snippets. Used for pagination."
    )
    snippets: list[KwicSnippet] = Field(
        description="The KWIC snippets for the matched keyword(s)."
    )


class Ngram(BaseModel):
    key: str = Field(description="The ngram string.")
    frequency: int = Field(description="The frequency of the ngram.")


class NgramResponse(BaseModel):
    current_frequency: int = Field(description="The current frequency of ngrams found.")
    total_frequency: int = Field(description="The total frequency of ngrams found.")
    ngrams: list[Ngram] = Field(description="The list of ngrams found in the document.")
