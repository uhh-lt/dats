from pydantic import BaseModel, Field


class CorefBase(BaseModel):
    id: int = Field(description="ID of the CorefJob")
    project_id: int = Field(description="Project the CorefJob belongs to")


class CorefInputDoc(BaseModel):
    id: int
    tokens: list[list[str]] = Field(description="tokens nested within sentences")


class CorefOutputDoc(BaseModel):
    id: int
    clusters: list[list[tuple[int, int]]]


class CorefJobInput(CorefBase):
    language: str
    documents: list[CorefInputDoc]


class CorefJobOutput(CorefBase):
    documents: list[CorefOutputDoc]
