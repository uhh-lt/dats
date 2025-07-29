from typing import NamedTuple

from pydantic import BaseModel, Field


class QuoteBase(BaseModel):
    id: int = Field(description="ID of the QuoteJob")
    project_id: int = Field(description="Project the QuoteJob belongs to")


class Token(NamedTuple):
    start: int
    end: int
    sent: int
    text: str


class Span(NamedTuple):
    start: int
    end: int
    text: str


class QuoteInputDoc(BaseModel):
    id: int
    text: str = Field(description="Full text of the document")
    sentences: list[Span] = Field(description="sentences as spans")
    tokens: list[Token] = Field(description="tokens with offsets")


class QuoteTuple(BaseModel):
    quote: list[tuple[int, int]]
    speaker: list[tuple[int, int]]
    cue: list[tuple[int, int]]
    addressee: list[tuple[int, int]]
    frame: list[tuple[int, int]]
    typ: str


class QuoteOutputDoc(BaseModel):
    id: int
    quotes: list[QuoteTuple]


class QuoteJobInput(QuoteBase):
    id: int = Field(description="ID of the QuoteJob")
    project_id: int = Field(description="Project the QuoteJob belongs to")
    documents: list[QuoteInputDoc]


class QuoteJobOutput(QuoteBase):
    documents: list[QuoteOutputDoc]
    info: list[dict]
