from typing import Optional

from pydantic import BaseModel, Field

from .dto_base import UpdateDTOBase


# Properties for creation
class DocumentTopicCreate(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    topic_id: int = Field(description="ID of the topic")


# Properties for updating
class DocumentTopicUpdate(BaseModel, UpdateDTOBase):
    is_accepted: Optional[bool] = Field(
        None, description="Update the acceptance status"
    )
