from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from repos.db.dto_base import UpdateDTOBase


class FolderType(str, Enum):
    NORMAL = "normal"
    # PROJECT = "project"
    SDOC_FOLDER = "sdoc_folder"


FOLDER_NAME_MAX_LENGTH = 231


class FolderBaseDTO(BaseModel):
    name: str = Field(
        description="Name of the folder",
        max_length=FOLDER_NAME_MAX_LENGTH,
    )
    folder_type: FolderType = Field(
        description="Type of the folder (normal, sdoc_folder)"
    )
    parent_id: int | None = Field(
        default=None, description="ID of the parent folder (nullable)"
    )
    project_id: int = Field(
        description="ID of the project this folder belongs to (nullable)"
    )


class FolderCreate(FolderBaseDTO):
    pass


class FolderUpdate(BaseModel, UpdateDTOBase):
    name: str | None = Field(default=None, description="Updated name of the folder")
    parent_id: int | None = Field(default=None, description="Updated parent folder ID")


class FolderRead(FolderBaseDTO):
    id: int = Field(description="ID of the Folder")
    created: datetime = Field(description="Creation timestamp of the folder")
    updated: datetime = Field(description="Update timestamp of the folder")
    model_config = ConfigDict(from_attributes=True)
