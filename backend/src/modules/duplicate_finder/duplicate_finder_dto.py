from typing import List

from pydantic import BaseModel, Field
from systems.job_system.job_dto import JobInputBase


class DuplicateFinderInput(JobInputBase):
    project_id: int = Field(..., description="Project ID to search for duplicates")
    user_id: int = Field(..., description="User ID who started the job")


class DuplicateInfo(BaseModel):
    doc_id: int = Field(..., description="Document ID")
    duplicate_of: int = Field(
        ..., description="ID of the document this is a duplicate of"
    )


class DuplicateFinderOutput(BaseModel):
    project_id: int = Field(..., description="Project ID")
    user_id: int = Field(..., description="User ID")
    duplicates: List[DuplicateInfo] = Field(..., description="List of found duplicates")
