from datetime import datetime
from typing import List, Optional

from app.core.data.dto.user import UserRead
from pydantic import BaseModel, Field

from .dto_base import UpdateDTOBase


# Properties shared across all DTOs
class ProjectBaseDTO(BaseModel):
    title: str = Field(description="Title of the Project")
    description: str = Field(description="Description of the Project")


# Properties for creation
class ProjectCreate(ProjectBaseDTO):
    pass


# Properties for updating
class ProjectUpdate(ProjectBaseDTO, UpdateDTOBase):
    title: Optional[str] = Field(description="Title of the Project", default=None)
    description: Optional[str] = Field(
        description="Description of the Project", default=None
    )


# Properties for reading (as in ORM)
class ProjectRead(ProjectBaseDTO):
    id: int = Field(description="ID of the Project")
    created: datetime = Field(description="Created timestamp of the Project")
    updated: datetime = Field(description="Updated timestamp of the Project")

    class Config:
        orm_mode = True


class ProjectReadAction(ProjectRead):
    users: List[UserRead] = Field(description="Users of the Project")
    num_sdocs: int = Field(description="Number of Sdocs in the Project")
