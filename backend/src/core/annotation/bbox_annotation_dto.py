from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from repos.db.dto_base import UpdateDTOBase


# Properties shared across all DTOs
class BBoxAnnotationBaseDTO(BaseModel):
    x_min: int = Field(description="Absolute x_min coordinate of the BBoxAnnotation")
    x_max: int = Field(description="Absolute x_max coordinate of the BBoxAnnotation")
    y_min: int = Field(description="Absolute y_min coordinate of the BBoxAnnotation")
    y_max: int = Field(description="Absolute y_max coordinate of the BBoxAnnotation")


# Properties for creation
class BBoxAnnotationCreateIntern(BBoxAnnotationBaseDTO):
    project_id: int = Field(description="Project the BBoxAnnotation belongs to")
    uuid: str = Field(description="UUID of the BBoxAnnotation")
    code_id: int = Field(description="Code the BBoxAnnotation refers to")
    annotation_document_id: int = Field(
        description="AnnotationDocument the BBoxAnnotation refers to"
    )


class BBoxAnnotationCreate(BBoxAnnotationBaseDTO):
    code_id: int = Field(description="Code the BBoxAnnotation refers to")
    sdoc_id: int = Field(description="SourceDocument the BBoxAnnotation refers to")


# Properties for updating
class BBoxAnnotationUpdate(BaseModel, UpdateDTOBase):
    code_id: int = Field(description="Code the BBoxAnnotation refers to")


class BBoxAnnotationUpdateBulk(BaseModel, UpdateDTOBase):
    bbox_annotation_id: int = Field(description="ID of the BBoxAnnotation")
    code_id: int = Field(description="Code the BBoxAnnotation refers to")


# Properties for reading (as in ORM)
class BBoxAnnotationRead(BBoxAnnotationBaseDTO):
    id: int = Field(description="ID of the BBoxAnnotation")
    code_id: int = Field(description="Code the BBoxAnnotation refers to")
    user_id: int = Field(description="User that created the BBoxAnnotation")
    sdoc_id: int = Field(description="SourceDocument the BBoxAnnotation refers to")
    created: datetime = Field(description="Created timestamp of the BBoxAnnotation")
    updated: datetime = Field(description="Updated timestamp of the BBoxAnnotation")
    memo_ids: list[int] = Field(description="Memo IDs attached to the BBoxAnnotation")
    model_config = ConfigDict(from_attributes=True)
