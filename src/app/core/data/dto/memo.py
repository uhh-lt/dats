from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

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
    title: str = Field(description='Title of the Memo')
    content: str = Field(description='Content of the Memo')


# Properties to update
class MemoUpdateBase(MemoBaseDTO, UpdateDTOBase):
    title: Optional[str] = Field(description='Title of the Memo', default=None)
    content: Optional[str] = Field(description='Content of the Memo', default=None)


# Properties to create
class MemoCreateBaseDTO(MemoBaseDTO):
    user_id: int = Field(description='User the Memo belongs to')
    project_id: int = Field(description='Project the Memo belongs to')


# Properties to read
class MemoReadBaseDTO(MemoBaseDTO):
    id: int = Field(description='ID of the Memo')
    user_id: int = Field(description='User the Memo belongs to')
    project_id: int = Field(description='Project the Memo belongs to')
    created: datetime = Field(description="Created timestamp of the Memo")
    updated: datetime = Field(description="Updated timestamp of the Memo")


# Properties in DB (as in ORM)
class MemoInDB(MemoReadBaseDTO):  # Flo: We inherit from ReadDTO because we want implicit orm_mode = True
    attached_to: int = Field(description='The ObjectHandle the Memo is attached to')


class MemoCreateAnnotationDocument(MemoCreateBaseDTO):
    source_document_id: int = Field(description='AnnotationDocument the Memo belongs to')


class MemoReadAnnotationDocument(MemoReadBaseDTO):
    source_document_id: int = Field(description='AnnotationDocument the Memo belongs to')


class MemoCreateCode(MemoCreateBaseDTO):
    code_id: int = Field(description='Code the Memo belongs to')


class MemoReadCode(MemoReadBaseDTO):
    code_id: int = Field(description='Code the Memo belongs to')


class MemoCreateSpanAnnotation(MemoCreateBaseDTO):
    span_annotation: int = Field(description='SpanAnnotation the Memo belongs to')


class MemoReadSpanAnnotation(MemoReadBaseDTO):
    span_annotation: int = Field(description='SpanAnnotation the Memo belongs to')
