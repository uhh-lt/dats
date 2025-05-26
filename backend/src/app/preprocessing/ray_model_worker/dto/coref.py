from typing import List, Tuple

from pydantic import BaseModel, Field


class CorefBase(BaseModel):
    id: int = Field(description="ID of the CorefJob")
    project_id: int = Field(description="Project the CorefJob belongs to")


class CorefInputDoc(BaseModel):
    id: int
    tokens: List[List[str]] = Field(description="tokens nested within sentences")


class CorefOutputDoc(BaseModel):
    id: int
    clusters: List[List[Tuple[int, int]]]


class CorefJobInput(CorefBase):
    language: str
    documents: List[CorefInputDoc]


class CorefJobOutput(CorefBase):
    documents: List[CorefOutputDoc]
