from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.data.dto.dto_base import UpdateDTOBase


# Properties shared across all DTOs
class WhiteboardBaseDTO(BaseModel):
    title: str = Field(description="Title of the Whiteboard")


# Properties for creation
class WhiteboardCreate(WhiteboardBaseDTO):
    project_id: int = Field(description="Project the Whiteboard belongs to")
    user_id: int = Field(description="User the Whiteboard belongs to")


class WhiteboardCreateAsInDB(WhiteboardCreate):
    content: Optional[str] = Field(
        description="Content of the Whiteboard", default=None
    )


# Properties for updating
class WhiteboardUpdate(BaseModel, UpdateDTOBase):
    title: Optional[str] = Field(
        description="Title of the Whiteboard",
        default=None,
    )
    content: Optional[str] = Field(
        description="Content of the Whiteboard",
        default=None,
    )


# Properties for reading (as in ORM)
class WhiteboardRead(WhiteboardBaseDTO):
    id: int = Field(description="ID of the Whiteboard")
    project_id: int = Field(description="Project the Whiteboard belongs to")
    user_id: int = Field(description="User the Whiteboard belongs to")
    created: datetime = Field(description="Created timestamp of the Whiteboard")
    updated: datetime = Field(description="Updated timestamp of the Whiteboard")
    content: str = Field(description="Content of the Whiteboard")
    model_config = ConfigDict(from_attributes=True)
