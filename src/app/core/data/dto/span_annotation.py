from datetime import datetime

from pydantic import BaseModel, Field

from .code import CodeRead
from .dto_base import UpdateDTOBase


# Properties shared across all DTOs
class SpanAnnotationBaseDTO(BaseModel):
    begin: int = Field(description='Begin of the SpanAnnotation')
    end: int = Field(description='End of the SpanAnnotation')


# Properties for creation
class SpanAnnotationCreate(SpanAnnotationBaseDTO):
    current_code_id: int = Field(description='CurrentCode the SpanAnnotation refers to')
    annotation_document_id: int = Field(description='AnnotationDocument the SpanAnnotation refers to')


# Properties for updating
class SpanAnnotationUpdate(SpanAnnotationBaseDTO, UpdateDTOBase):
    current_code_id: int = Field(description='CurrentCode the SpanAnnotation refers to')


# Properties for reading (as in ORM)
class SpanAnnotationRead(SpanAnnotationBaseDTO):
    id: int = Field(description='ID of the SpanAnnotation')
    current_code_id: int = Field(description='CurrentCode the SpanAnnotation refers to')
    annotation_document_id: int = Field(description='AnnotationDocument the SpanAnnotation refers to')
    created: datetime = Field(description="Created timestamp of the SpanAnnotation")
    updated: datetime = Field(description="Updated timestamp of the SpanAnnotation")

    class Config:
        orm_mode = True


class SpanAnnotationReadResolvedCode(SpanAnnotationBaseDTO):
    id: int = Field(description='ID of the SpanAnnotation')
    code: CodeRead = Field(description='Code the SpanAnnotation refers to')
    annotation_document_id: int = Field(description='AnnotationDocument the SpanAnnotation refers to')
    created: datetime = Field(description="Created timestamp of the SpanAnnotation")
    updated: datetime = Field(description="Updated timestamp of the SpanAnnotation")
