from pydantic import BaseModel, Field


class ViTGPT2FilePathInput(BaseModel):
    image_fp: str = Field(example="/path/to/image.png")


class ViTGPT2Output(BaseModel):
    caption: str = Field(example="An image of a dog.")
