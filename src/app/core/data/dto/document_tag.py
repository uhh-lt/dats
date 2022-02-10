from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.core.data.dto.dto_base import UpdateDTOBase, ReadDTOBase


# Properties shared across all DTOs
class DocumentTagBaseDTO(BaseModel):
    title: str = Field(description='Title of the DocumentTag')
    description: str = Field(description='Description of the DocumentTag')


# Properties for creation
class DocumentTagCreate(DocumentTagBaseDTO):
    title: str = Field(description='Title of the DocumentTag')
    description: Optional[str] = Field(description='Description of the DocumentTag', default=None)
    project_id: int = Field(description='Project the DocumentTag belongs to')


# Properties for updating
class DocumentTagUpdate(DocumentTagBaseDTO, UpdateDTOBase):
    title: Optional[str] = Field(description='Title of the DocumentTag', default=None)
    description: Optional[str] = Field(description='Description of the DocumentTag', default=None)


# Properties for reading (as in ORM)
class DocumentTagRead(DocumentTagBaseDTO):
    id: int = Field(description='ID of the DocumentTag')
    created: datetime = Field(description="Created timestamp of the DocumentTag")
    updated: datetime = Field(description="Updated timestamp of the DocumentTag")

    class Config:
        orm_mode = True