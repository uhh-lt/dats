from pydantic import BaseModel, Field


class ViTGPT2FilePathInput(BaseModel):
    image_fp: str = Field(examples=["image.png"])
    project_id: int = Field(examples=[1])


class ViTGPT2Output(BaseModel):
    caption: str = Field(examples=["An image of a dog."])
