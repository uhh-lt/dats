from pydantic import BaseModel, Field


class ObjectBBox(BaseModel):
    label: str = Field(examples=["PERSON"])
    x_min: int = Field(examples=[0])
    y_min: int = Field(examples=[0])
    x_max: int = Field(examples=[100])
    y_max: int = Field(examples=[100])
    confidence: float = Field(examples=[0.9])


class DETRImageInput(BaseModel):
    base64_image: str = Field(
        examples=["base64_image"], description="The base64 encoded image."
    )


class DETRObjectDetectionOutput(BaseModel):
    bboxes: list[ObjectBBox] = Field(
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
