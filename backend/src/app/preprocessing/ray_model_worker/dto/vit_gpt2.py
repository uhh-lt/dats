from pydantic import BaseModel, Field


class ViTGPT2FilePathInput(BaseModel):
    image_fp: str = Field(examples=["/path/to/image.png"])


class ViTGPT2Output(BaseModel):
    caption: str = Field(examples=["An image of a dog."])
