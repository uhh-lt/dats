from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.core.data.dto.dto_base import UpdateDTOBase


# Properties shared across all DTOs
class SpanGroupBaseDTO(BaseModel):
    name: str = Field(description="Name of the SpanGroup")


# Properties for creation
class SpanGroupCreate(SpanGroupBaseDTO):
    annotation_document_id: int = Field(
        description="The ID of the AnnotationDocument the SpanGroup belongs to"
    )


# Properties for updating
class SpanGroupUpdate(SpanGroupBaseDTO, UpdateDTOBase):
    name: Optional[str] = Field(description="Name of the SpanGroup", default=None)


# Properties for reading (as in ORM)
class SpanGroupRead(SpanGroupBaseDTO):
    id: int = Field(description="ID of the SpanGroup")
    annotation_document_id: int = Field(
        description="The ID of the AnnotationDocument the SpanGroup belongs to"
    )
    created: datetime = Field(description="Created timestamp of the SpanGroup")
    updated: datetime = Field(description="Updated timestamp of the SpanGroup")

    class Config:
        orm_mode = True


# To link a SpanAnnotation with a SpanGroup
class SpanAnnotationSpanGroupLink(BaseModel):
    span_annotation_id: int = Field(description="ID of the SpanAnnotation")
    span_group_id: int = Field(description="ID of the SpanGroup")
