from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .dto_base import UpdateDTOBase


# Properties shared across all DTOs
class CodeBaseDTO(BaseModel):
    name: str = Field(description='Name of the Code')
    color: str = Field(description='Color of the Code')
    description: str = Field(description='Description of the Code')
    parent_code_id: Optional[int] = Field(description='Parent of the Code', default=None)


# Properties for creation
class CodeCreate(CodeBaseDTO):
    project_id: int = Field(description='Project the Code belongs to')
    user_id: int = Field(description='User the Code belongs to')


# Properties for updating
class CodeUpdate(CodeBaseDTO, UpdateDTOBase):
    name: Optional[str] = Field(description='Name of the Code', default=None)
    color: Optional[str] = Field(description='Color of the Code', default=None)
    description: Optional[str] = Field(description='Description of the Code', default=None)


# Properties for reading (as in ORM)
class CodeRead(CodeBaseDTO):
    id: int = Field(description='ID of the Code')
    project_id: int = Field(description='Project the Code belongs to')
    user_id: int = Field(description='User the Code belongs to')
    created: datetime = Field(description="Created timestamp of the Code")
    updated: datetime = Field(description="Updated timestamp of the Code")

    class Config:
        orm_mode = True
