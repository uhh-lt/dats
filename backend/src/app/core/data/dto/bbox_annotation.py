from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from .code import CodeRead
from .dto_base import UpdateDTOBase


# Properties shared across all DTOs
class BBoxAnnotationBaseDTO(BaseModel):
    x_min: int = Field(description="Absolute x_min coordinate of the BBoxAnnotation")
    x_max: int = Field(description="Absolute x_max coordinate of the BBoxAnnotation")
    y_min: int = Field(description="Absolute y_min coordinate of the BBoxAnnotation")
    y_max: int = Field(description="Absolute y_max coordinate of the BBoxAnnotation")


# Properties for creation
class BBoxAnnotationCreateIntern(BBoxAnnotationBaseDTO):
    current_code_id: int = Field(description="CurrentCode the BBoxAnnotation refers to")
    adoc_id: int = Field(
        description="AnnotationDocument the BBoxAnnotation refers to"
    )


class BBoxAnnotationCreate(BBoxAnnotationBaseDTO):
    current_code_id: int = Field(description="CurrentCode the BBoxAnnotation refers to")
    user_id: int = Field(
        description="User that created the BBoxAnnotation"
    )
    sdoc_id: int = Field(
        description="SourceDocument the BBoxAnnotation refers to"
    )


class BBoxAnnotationCreateWithCodeId(BBoxAnnotationBaseDTO):
    code_id: int = Field(description="Code the BBoxAnnotation refers to")
    user_id: int = Field(
        description="User that created the BBoxAnnotation"
    )
    sdoc_id: int = Field(
        description="SourceDocument the BBoxAnnotation refers to"
    )


# Properties for updating
class BBoxAnnotationUpdate(BaseModel, UpdateDTOBase):
    current_code_id: int = Field(description="CurrentCode the BBoxAnnotation refers to")


# Properties for updating
class BBoxAnnotationUpdateWithCodeId(BaseModel, UpdateDTOBase):
    code_id: int = Field(description="Code the BBoxAnnotation refers to")


# Properties for reading (as in ORM)
class BBoxAnnotationRead(BBoxAnnotationBaseDTO):
    id: int = Field(description="ID of the BBoxAnnotation")
    current_code_id: int = Field(description="CurrentCode the BBoxAnnotation refers to")
    user_id: int = Field(
        description="User that created the BBoxAnnotation"
    )
    sdoc_id: int = Field(
        description="SourceDocument the BBoxAnnotation refers to"
    )
    created: datetime = Field(description="Created timestamp of the BBoxAnnotation")
    updated: datetime = Field(description="Updated timestamp of the BBoxAnnotation")
    model_config = ConfigDict(from_attributes=True)


class BBoxAnnotationReadResolvedCode(BBoxAnnotationBaseDTO):
    id: int = Field(description="ID of the BBoxAnnotation")
    code: CodeRead = Field(description="Code the BBoxAnnotation refers to")
    user_id: int = Field(description="User the SpanAnnotation belongs to")
    sdoc_id: int = Field(description="SourceDocument the SpanAnnotation refers to")
    created: datetime = Field(description="Created timestamp of the BBoxAnnotation")
    updated: datetime = Field(description="Updated timestamp of the BBoxAnnotation")
