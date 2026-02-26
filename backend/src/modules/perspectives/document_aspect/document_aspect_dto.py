from pydantic import BaseModel, Field

from repos.db.dto_base import UpdateDTOBase


# Properties for creation
class DocumentAspectCreate(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    aspect_id: int = Field(description="ID of the aspect")
    content: str = Field(description="Content of the document aspect")


# Properties for updating
class DocumentAspectUpdate(BaseModel, UpdateDTOBase):
    content: str | None = Field(
        default=None, description="Updated content of the document aspect"
    )
    x: float | None = Field(default=None, description="Updated current X coordinate")
    y: float | None = Field(default=None, description="Updated current Y coordinate")
