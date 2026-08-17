from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator

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
    icon: str | None = Field(
        default=None,
        max_length=64,
        description="Optional Unicode emoji used as the Memo icon",
    )
    content: str = Field(description="Textual content of the Memo")
    content_json: str = Field(description="JSON content of the Memo")


# Properties to update
class MemoUpdate(BaseModel):
    title: str | None = Field(description="Title of the Memo", default=None)
    icon: str | None = Field(
        default=None,
        max_length=64,
        description="Optional Unicode emoji used as the Memo icon",
    )
    content: str | None = Field(description="Textual content of the Memo", default=None)
    content_json: str | None = Field(
        description="JSON content of the Memo", default=None
    )

    @model_validator(mode="after")
    def check_at_least_one_field_is_set(self) -> "MemoUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one field has to be provided for an update")

        required_fields = {"title", "content", "content_json"}
        invalid_fields = {
            field
            for field in required_fields.intersection(self.model_fields_set)
            if getattr(self, field) is None
        }
        if invalid_fields:
            raise ValueError(
                f"Fields cannot be null: {', '.join(sorted(invalid_fields))}"
            )
        return self


# Properties to create
class MemoCreate(MemoBaseDTO):
    pass


class MemoCreateIntern(MemoCreate):
    project_id: int = Field(description="Project the Memo belongs to")
    uuid: str = Field(description="UUID of the Memo")
    user_id: int = Field(description="User the Memo belongs to")


# Properties to read
class MemoReadBaseDTO(MemoBaseDTO):
    id: int = Field(description="ID of the Memo")
    is_favorite: bool = Field(
        description="Whether the requesting user favorited the Memo", default=False
    )
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
