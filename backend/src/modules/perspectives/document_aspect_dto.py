from typing import Optional

from pydantic import BaseModel, Field
from repos.db.dto_base import UpdateDTOBase


# Properties for creation
class DocumentAspectCreate(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    aspect_id: int = Field(description="ID of the aspect")
    content: str = Field(description="Content of the document aspect")


# Properties for updating
class DocumentAspectUpdate(BaseModel, UpdateDTOBase):
    content: Optional[str] = Field(
        default=None, description="Updated content of the document aspect"
    )
    x: Optional[float] = Field(default=None, description="Updated current X coordinate")
    y: Optional[float] = Field(default=None, description="Updated current Y coordinate")
