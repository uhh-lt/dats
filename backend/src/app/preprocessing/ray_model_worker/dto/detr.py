from typing import List

from pydantic import BaseModel, Field


class ObjectBBox(BaseModel):
    label: str = Field(example="PERSON")
    x_min: int = Field(example=0)
    y_min: int = Field(example=0)
    x_max: int = Field(example=100)
    y_max: int = Field(example=100)
    confidence: float = Field(example=0.9)


class DETRFilePathInput(BaseModel):
    image_fp: str = Field(example="/path/to/image.png")


class DETRObjectDetectionOutput(BaseModel):
    bboxes: List[ObjectBBox] = Field(
        example=[
            ObjectBBox(
                label="PERSON",
                x_min=0,
                y_min=0,
                x_max=100,
                y_max=100,
                confidence=0.9,
            )
        ]
    )
