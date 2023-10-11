from pydantic import BaseModel, Field


class Blip2FilePathInput(BaseModel):
    image_fp: str = Field(example="/path/to/image.png")


class Blip2Output(BaseModel):
    caption: str = Field(example="An image of a dog.")
