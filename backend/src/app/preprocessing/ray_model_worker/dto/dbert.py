from pydantic import BaseModel, Field


class DbertInput(BaseModel):
    sentence: str = Field(..., example="I love you")


class DbertOutput(BaseModel):
    label: str = Field(..., example="Label_0")
    confidence: float = Field(..., example=1.0)
