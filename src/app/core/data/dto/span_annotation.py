from datetime import datetime

from pydantic import BaseModel, Field

from .code import CodeRead
from .dto_base import UpdateDTOBase


# Properties shared across all DTOs
class SpanAnnotationBaseDTO(BaseModel):
    begin: int = Field(description='Begin of the SpanAnnotation')
    end: int = Field(description='End of the SpanAnnotation')
    # TODO Flo: Token offset


# Properties for creation
class SpanAnnotationCreate(SpanAnnotationBaseDTO):
    span_text: str = Field(description='The SpanText the SpanAnnotation spans.')
    current_code_id: int = Field(description='CurrentCode the SpanAnnotation refers to')
    annotation_document_id: int = Field(description='AnnotationDocument the SpanAnnotation refers to')


# Properties for updating
class SpanAnnotationUpdate(SpanAnnotationBaseDTO, UpdateDTOBase):
    current_code_id: int = Field(description='CurrentCode the SpanAnnotation refers to')


# Properties for reading (as in ORM)
class SpanAnnotationRead(SpanAnnotationBaseDTO):
    id: int = Field(description='ID of the SpanAnnotation')
    span_text_id: str = Field(description='The SpanText the SpanAnnotation spans.')
    current_code_id: int = Field(description='CurrentCode the SpanAnnotation refers to')
    annotation_document_id: int = Field(description='AnnotationDocument the SpanAnnotation refers to')
    created: datetime = Field(description="Created timestamp of the SpanAnnotation")
    updated: datetime = Field(description="Updated timestamp of the SpanAnnotation")

    class Config:
        orm_mode = True


class SpanAnnotationReadResolved(SpanAnnotationBaseDTO):
    id: int = Field(description='ID of the SpanAnnotation')
    span_text: str = Field(description='The SpanText the SpanAnnotation spans.')
    code: CodeRead = Field(description='Code the SpanAnnotation refers to')
    annotation_document_id: int = Field(description='AnnotationDocument the SpanAnnotation refers to')
    created: datetime = Field(description="Created timestamp of the SpanAnnotation")
    updated: datetime = Field(description="Updated timestamp of the SpanAnnotation")
