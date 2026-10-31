from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field

from common.doc_type_enum import DocType
from common.meta_type_enum import MetaType
from repos.db.dto_base import UpdateDTOBase


# Properties shared across all DTOs
class ProjectMetadataBaseDTO(BaseModel):
    key: str = Field(description="Key of the ProjectMetadata")
    metatype: MetaType = Field(description="Type of the ProjectMetadata")
    read_only: bool = Field(
        description=(
            "Flag that tells if the ProjectMetadata cannot be changed."
            " Used for system generated metadata! Use False for user metadata."
        ),
        default=False,
    )
    doctype: DocType = Field(
        description="DOCTYPE of the SourceDocument this metadata refers to"
    )
    description: str = Field(description="Description of the ProjectMetadata")


# Properties for creation
class ProjectMetadataCreate(ProjectMetadataBaseDTO):
    project_id: int = Field(description="Project the ProjectMetadata belongs to")


# Properties for updating
class ProjectMetadataUpdate(BaseModel, UpdateDTOBase):
    # NOT NULL columns: omit to keep the value, an explicit null is rejected
    non_nullable_fields: ClassVar[frozenset[str]] = frozenset(
        {"key", "metatype", "description"}
    )

    key: str | None = Field(description="Key of the ProjectMetadata", default=None)
    metatype: MetaType | None = Field(
        description="Type of the ProjectMetadata", default=None
    )
    description: str | None = Field(
        description="Description of the ProjectMetadata", default=None
    )


# Properties to update in bulk
class ProjectMetadataUpdateBulk(ProjectMetadataUpdate):
    project_metadata_id: int = Field(description="ID of the ProjectMetadata to update")


# Properties for reading (as in ORM)
class ProjectMetadataRead(ProjectMetadataBaseDTO):
    id: int = Field(description="ID of the ProjectMetadata")
    project_id: int = Field(description="Project the ProjectMetadata belongs to")
    model_config = ConfigDict(from_attributes=True)
