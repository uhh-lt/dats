from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CodeBranchCreate(BaseModel):
    project_id: int
    name: str = Field(min_length=1)


class CodeBranchRead(BaseModel):
    id: int
    project_id: int
    name: str
    is_archived: bool
    created_by_id: int | None
    created: datetime
    updated: datetime
    model_config = ConfigDict(from_attributes=True)
