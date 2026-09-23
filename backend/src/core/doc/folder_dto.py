from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator

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


# Properties to update in bulk
class FolderUpdateBulk(FolderUpdate):
    folder_id: int = Field(description="ID of the Folder to update")

    @model_validator(mode="after")
    def check_at_least_one_updatable_field(self) -> "FolderUpdateBulk":
        # folder_id is always set, so the inherited "at least one field" check would
        # pass trivially; require at least one actual updatable field instead. Uses
        # model_fields_set (not truthiness) so an explicit parent_id=None (root move)
        # counts as a valid update.
        updatable = {"name", "parent_id"}
        if not updatable.intersection(self.model_fields_set):
            raise ValueError("At least one updatable field has to be provided")
        return self


class FolderRead(FolderBaseDTO):
    id: int = Field(description="ID of the Folder")
    created: datetime = Field(description="Creation timestamp of the folder")
    updated: datetime = Field(description="Update timestamp of the folder")
    model_config = ConfigDict(from_attributes=True)
