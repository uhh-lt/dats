from pydantic import BaseModel, Field
from systems.job_system.job_dto import JobInputBase


class DuplicateFinderInput(JobInputBase):
    project_id: int = Field(..., description="Project ID to search for duplicates")
    max_different_words: int = Field(
        ..., description="Number of different words allowed between duplicates"
    )


class DuplicateFinderOutput(BaseModel):
    duplicates: list[list[int]] = Field(
        ..., description="List of found duplicate clusters"
    )
