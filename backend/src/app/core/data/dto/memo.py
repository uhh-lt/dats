from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .dto_base import UpdateDTOBase

"""
 Flo:
 We have to create different Create and Read DTOs for every Object Type it can be attached to so that the
 frontend never sees the ObjectHandle.

 Further, because we're not storing the content in the SQL DB but only in the ES instance we handle this differently
  than in other DTOs.
"""


# Properties shared across all DTOs
class MemoBaseDTO(BaseModel):
    title: str = Field(description="Title of the Memo")
    content: str = Field(description="Content of the Memo")


# Properties to update
class MemoUpdate(BaseModel, UpdateDTOBase):
    title: Optional[str] = Field(description="Title of the Memo", default=None)
    content: Optional[str] = Field(description="Content of the Memo", default=None)
    starred: Optional[bool] = Field(
        description="Starred flag of the Memo", default=None
    )


# Properties to create
class MemoCreate(MemoBaseDTO):
    starred: Optional[bool] = Field(
        description="Starred flag of the Memo", default=False
    )


class MemoCreateIntern(MemoCreate):
    project_id: int = Field(description="Project the Memo belongs to")
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


class MemoReadSourceDocument(MemoReadBaseDTO):
    attached_source_document_id: int = Field(
        description="SourceDocument the Memo is attached to"
    )


class MemoReadCode(MemoReadBaseDTO):
    attached_code_id: int = Field(description="Code the Memo is attached to")


class MemoReadSpanAnnotation(MemoReadBaseDTO):
    attached_span_annotation_id: int = Field(
        description="SpanAnnotation the Memo is attached to"
    )


class MemoReadProject(MemoReadBaseDTO):
    attached_project_id: int = Field(description="Project the Memo is attached to")


class MemoReadDocumentTag(MemoReadBaseDTO):
    attached_document_tag_id: int = Field(
        description="DocumentTag the Memo is attached to"
    )


class AttachedObjectType(str, Enum):
    source_document = "source_document"
    code = "code"
    span_annotation = "span_annotation"
    span_group = "span_group"
    bbox_annotation = "bbox_annotation"
    project = "project"
    document_tag = "document_tag"


class MemoRead(MemoReadBaseDTO):
    attached_object_id: int = Field(
        description="ID of the Object the Memo is attached to"
    )
    attached_object_type: AttachedObjectType = Field(
        description="Type of the Object the ID refers to"
    )
