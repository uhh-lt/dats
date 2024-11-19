from typing import List

from pydantic import BaseModel, Field


class ObjectBBox(BaseModel):
    label: str = Field(examples=["PERSON"])
    x_min: int = Field(examples=[0])
    y_min: int = Field(examples=[0])
    x_max: int = Field(examples=[100])
    y_max: int = Field(examples=[100])
    confidence: float = Field(examples=[0.9])


class DETRFilePathInput(BaseModel):
    image_fp: str = Field(examples=["image.png"])
    project_id: int = Field(examples=[1])


class DETRObjectDetectionOutput(BaseModel):
    bboxes: List[ObjectBBox] = Field(
        examples=[
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
