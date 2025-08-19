from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from repos.db.dto_base import UpdateDTOBase
from utils.color_utils import get_next_color


# Properties shared across all DTOs
class TagBaseDTO(BaseModel):
    name: str = Field(description="Title of the Tag")
    color: str = Field(description="Color of the Tag")
    description: str | None = Field(description="Description of the Tag", default=None)
    parent_id: int | None = Field(description="Parent of the Tag", default=None)


# Properties for creation
class TagCreate(TagBaseDTO):
    project_id: int = Field(description="Project the Tag belongs to")
    color: str = Field(description="Color of the Code", default_factory=get_next_color)


# Properties for updating
class TagUpdate(BaseModel, UpdateDTOBase):
    name: str | None = Field(description="Name of the Tag", default=None)
    color: str | None = Field(description="Color of the Tag", default=None)
    description: str | None = Field(description="Description of the Tag", default=None)
    parent_id: int | None = Field(description="Parent of the Tag", default=None)


# Properties for reading (as in ORM)
class TagRead(TagBaseDTO):
    id: int = Field(description="ID of the Tag")
    project_id: int = Field(description="Project the Tag belongs to")
    created: datetime = Field(description="Created timestamp of the Tag")
    updated: datetime = Field(description="Updated timestamp of the Tag")
    memo_ids: list[int] = Field(description="Memo IDs attached to the Tag")
    model_config = ConfigDict(from_attributes=True)


# To link a SourceDocument with a Tag
class SourceDocumentTagLink(BaseModel):
    source_document_id: int = Field(description="ID of the SourceDocument")
    tag_id: int = Field(description="ID of the Tag")


# To link multiple SourceDocuments with multiple Tag
class SourceDocumentTagMultiLink(BaseModel):
    source_document_ids: list[int] = Field(description="List of IDs of SourceDocuments")
    tag_ids: list[int] = Field(description="List of IDs of Tags")


class SourceDocumentTagLinks(BaseModel):
    source_document_id: int = Field(description="ID of SourceDocument")
    tag_ids: list[int] = Field(description="List of IDs of Tags")
