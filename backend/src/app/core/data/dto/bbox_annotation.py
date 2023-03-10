from datetime import datetime

from pydantic import BaseModel, Field

from .code import CodeRead
from .dto_base import UpdateDTOBase


# Properties shared across all DTOs
class BBoxAnnotationBaseDTO(BaseModel):
    x_min: int = Field(description="Absolute x_min coordinate of the BBoxAnnotation")
    x_max: int = Field(description="Absolute x_max coordinate of the BBoxAnnotation")
    y_min: int = Field(description="Absolute y_min coordinate of the BBoxAnnotation")
    y_max: int = Field(description="Absolute y_max coordinate of the BBoxAnnotation")


# Properties for creation
class BBoxAnnotationCreate(BBoxAnnotationBaseDTO):
    current_code_id: int = Field(description="CurrentCode the BBoxAnnotation refers to")
    annotation_document_id: int = Field(
        description="AnnotationDocument the BBoxAnnotation refers to"
    )


# Properties for updating
class BBoxAnnotationUpdate(BBoxAnnotationBaseDTO, UpdateDTOBase):
    current_code_id: int = Field(description="CurrentCode the BBoxAnnotation refers to")


# Properties for reading (as in ORM)
class BBoxAnnotationRead(BBoxAnnotationBaseDTO):
    id: int = Field(description="ID of the BBoxAnnotation")
    current_code_id: int = Field(description="CurrentCode the BBoxAnnotation refers to")
    annotation_document_id: int = Field(
        description="AnnotationDocument the BBoxAnnotation refers to"
    )
    created: datetime = Field(description="Created timestamp of the BBoxAnnotation")
    updated: datetime = Field(description="Updated timestamp of the BBoxAnnotation")

    class Config:
        orm_mode = True


class BBoxAnnotationReadResolvedCode(BBoxAnnotationBaseDTO):
    id: int = Field(description="ID of the BBoxAnnotation")
    code: CodeRead = Field(description="Code the BBoxAnnotation refers to")
    annotation_document_id: int = Field(
        description="AnnotationDocument the BBoxAnnotation refers to"
    )
    created: datetime = Field(description="Created timestamp of the BBoxAnnotation")
    updated: datetime = Field(description="Updated timestamp of the BBoxAnnotation")
