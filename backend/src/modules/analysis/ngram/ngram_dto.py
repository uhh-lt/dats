from enum import Enum

from pydantic import BaseModel, Field


class Ngrams(str, Enum):
    UNIGRAM = "1"
    BIGRAM = "2"
    TRIGRAM = "3"


class Ngram(BaseModel):
    key: str = Field(description="The ngram string.")
    frequency: int = Field(description="The frequency of the ngram.")


class NgramResponse(BaseModel):
    current_frequency: int = Field(description="The current frequency of ngrams found.")
    total_frequency: int = Field(description="The total frequency of ngrams found.")
    ngrams: list[Ngram] = Field(description="The list of ngrams found in the document.")
