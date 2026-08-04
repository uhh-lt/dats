from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

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
    code_id: int | None = Field(
        default=None, description="Code the BBoxAnnotation refers to"
    )
    x_min: int | None = Field(
        default=None,
        ge=0,
        description="Absolute x_min coordinate of the BBoxAnnotation",
    )
    x_max: int | None = Field(
        default=None,
        ge=0,
        description="Absolute x_max coordinate of the BBoxAnnotation",
    )
    y_min: int | None = Field(
        default=None,
        ge=0,
        description="Absolute y_min coordinate of the BBoxAnnotation",
    )
    y_max: int | None = Field(
        default=None,
        ge=0,
        description="Absolute y_max coordinate of the BBoxAnnotation",
    )

    @model_validator(mode="after")
    def validate_update(self):
        resize_fields = {
            "x_min",
            "x_max",
            "y_min",
            "y_max",
        }
        provided_resize_fields = resize_fields.intersection(self.model_fields_set)

        if provided_resize_fields and provided_resize_fields != resize_fields:
            raise ValueError(
                "All bbox resize fields must be provided together: "
                "x_min, x_max, y_min and y_max."
            )

        if provided_resize_fields:
            if (
                self.x_min is None
                or self.x_max is None
                or self.y_min is None
                or self.y_max is None
            ):
                raise ValueError("BBox resize fields must not be null.")

            if self.x_min > self.x_max:
                raise ValueError("x_min must not be larger than x_max.")

            if self.y_min > self.y_max:
                raise ValueError("y_min must not be larger than y_max.")

        if self.code_id is None and not provided_resize_fields:
            raise ValueError("At least one bbox annotation update must be provided.")

        return self


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
