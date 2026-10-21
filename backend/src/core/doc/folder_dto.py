from datetime import datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field

from core.doc.folder_enum import FolderType
from repos.db.dto_base import UpdateDTOBase

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
    # NOT NULL columns: omit to keep the value, an explicit null is rejected
    non_nullable_fields: ClassVar[frozenset[str]] = frozenset({"name"})

    name: str | None = Field(default=None, description="Updated name of the folder")
    parent_id: int | None = Field(default=None, description="Updated parent folder ID")


# Properties to update in bulk
class FolderUpdateBulk(FolderUpdate):
    folder_id: int = Field(description="ID of the Folder to update")


class FolderRead(FolderBaseDTO):
    id: int = Field(description="ID of the Folder")
    created: datetime = Field(description="Creation timestamp of the folder")
    updated: datetime = Field(description="Update timestamp of the folder")
    model_config = ConfigDict(from_attributes=True)
