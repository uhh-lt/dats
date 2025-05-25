from typing import Optional

from pydantic import BaseModel, Field

from .dto_base import UpdateDTOBase


# Properties for creation
class DocumentTopicCreate(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    topic_id: int = Field(description="ID of the topic")


# Properties for updating
class DocumentTopicUpdate(BaseModel, UpdateDTOBase):
    topic_id: Optional[int] = Field(default=None, description="Update the topic ID")
    is_accepted: Optional[bool] = Field(
        default=None, description="Update the acceptance status"
    )
    distance: Optional[float] = Field(
        default=None, description="Update distance to the assigned topic"
    )
