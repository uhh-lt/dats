from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from repos.db.dto_base import UpdateDTOBase
from utils.color_utils import get_next_color


# Properties shared across all DTOs
class CodeBaseDTO(BaseModel):
    name: str = Field(description="Name of the Code")
    color: str = Field(description="Color of the Code")
    description: str = Field(description="Description of the Code")
    parent_id: int | None = Field(description="Parent of the Code", default=None)
    enabled: bool = Field(
        default=True,
        description="While false, the code is neither created in pre-processing nor shown in the UI (except in settings to enable it again)",
    )


# Properties for creation
class CodeCreate(CodeBaseDTO):
    project_id: int = Field(description="Project the Code belongs to")
    color: str = Field(description="Color of the Code", default_factory=get_next_color)
    is_system: bool = Field(description="Is the Code a system code")


# Properties for updating
class CodeUpdate(BaseModel, UpdateDTOBase):
    name: str | None = Field(description="Name of the Code", default=None)
    color: str | None = Field(description="Color of the Code", default=None)
    description: str | None = Field(description="Description of the Code", default=None)
    parent_id: int | None = Field(description="Parent of the Code", default=None)
    enabled: bool | None = Field(
        default=None,
        description="While false, the code is neither created in pre-processing nor shown in the UI (except in settings to enable it again)",
    )


# Properties for reading (as in ORM)
class CodeRead(CodeBaseDTO):
    id: int = Field(description="ID of the Code")
    project_id: int = Field(description="Project the Code belongs to")
    created: datetime = Field(description="Created timestamp of the Code")
    updated: datetime = Field(description="Updated timestamp of the Code")
    is_system: bool = Field(description="Is the Code a system code")
    memo_ids: list[int] = Field(description="Memo IDs attached to the Code")
    model_config = ConfigDict(from_attributes=True)
