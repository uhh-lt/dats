from typing import Optional

from pydantic import BaseModel, Field

from .dto_base import UpdateDTOBase


# Properties for creation
class DocumentAspectCreate(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    aspect_id: int = Field(description="ID of the aspect")
    content: str = Field(description="Content of the document aspect")


# Properties for updating
class DocumentAspectUpdate(BaseModel, UpdateDTOBase):
    content: Optional[str] = Field(
        None, description="Updated content of the document aspect"
    )
    og_x: Optional[float] = Field(None, description="Updated original X coordinate")
    og_y: Optional[float] = Field(None, description="Updated original Y coordinate")
    x: Optional[float] = Field(None, description="Updated current X coordinate")
    y: Optional[float] = Field(None, description="Updated current Y coordinate")
