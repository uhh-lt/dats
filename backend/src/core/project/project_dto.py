from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from repos.db.dto_base import UpdateDTOBase


# Properties shared across all DTOs
class ProjectBaseDTO(BaseModel):
    title: str = Field(description="Title of the Project")
    description: str = Field(description="Description of the Project")


# Properties for creation
class ProjectCreate(ProjectBaseDTO):
    pass


# Properties for updating
class ProjectUpdate(BaseModel, UpdateDTOBase):
    title: str | None = Field(description="Title of the Project", default=None)
    description: str | None = Field(
        description="Description of the Project", default=None
    )


# Properties for reading (as in ORM)
class ProjectRead(ProjectBaseDTO):
    id: int = Field(description="ID of the Project")
    created: datetime = Field(description="Created timestamp of the Project")
    updated: datetime = Field(description="Updated timestamp of the Project")
    model_config = ConfigDict(from_attributes=True)
