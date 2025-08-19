from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from repos.db.dto_base import UpdateDTOBase

"""
 Flo:
 We have to create different Create and Read DTOs for every Object Type it can be attached to so that the
 frontend never sees the ObjectHandle.

 Further, because we're not storing the content in the SQL DB but only in the ES instance we handle this differently
  than in other DTOs.
"""


class AttachedObjectType(str, Enum):
    source_document = "source_document"
    code = "code"
    sentence_annotation = "sentence_annotation"
    span_annotation = "span_annotation"
    span_group = "span_group"
    bbox_annotation = "bbox_annotation"
    project = "project"
    tag = "tag"


# Properties shared across all DTOs
class MemoBaseDTO(BaseModel):
    title: str = Field(description="Title of the Memo")
    content: str = Field(description="Textual content of the Memo")
    content_json: str = Field(description="JSON content of the Memo")


# Properties to update
class MemoUpdate(BaseModel, UpdateDTOBase):
    title: str | None = Field(description="Title of the Memo", default=None)
    content: str | None = Field(description="Textual content of the Memo", default=None)
    content_json: str | None = Field(
        description="JSON content of the Memo", default=None
    )
    starred: bool | None = Field(description="Starred flag of the Memo", default=None)


# Properties to create
class MemoCreate(MemoBaseDTO):
    starred: bool | None = Field(description="Starred flag of the Memo", default=False)


class MemoCreateIntern(MemoCreate):
    project_id: int = Field(description="Project the Memo belongs to")
    uuid: str = Field(description="UUID of the Memo")
    user_id: int = Field(description="User the Memo belongs to")


# Properties to read
class MemoReadBaseDTO(MemoBaseDTO):
    id: int = Field(description="ID of the Memo")
    starred: bool = Field(description="Starred flag of the Memo")
    user_id: int = Field(description="User the Memo belongs to")
    project_id: int = Field(description="Project the Memo belongs to")
    created: datetime = Field(description="Created timestamp of the Memo")
    updated: datetime = Field(description="Updated timestamp of the Memo")


# Properties in DB (as in ORM)
class MemoInDB(MemoReadBaseDTO):
    attached_to_id: int = Field(description="The ObjectHandle the Memo is attached to")
    model_config = ConfigDict(from_attributes=True)


class MemoRead(MemoReadBaseDTO):
    attached_object_id: int = Field(
        description="ID of the Object the Memo is attached to"
    )
    attached_object_type: AttachedObjectType = Field(
        description="Type of the Object the ID refers to"
    )
