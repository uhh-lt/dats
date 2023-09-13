from typing import List, Tuple

from pydantic import BaseModel, Field


class SpacyInput(BaseModel):
    text: str = Field(example="I love Hamburg!")
    language: str = Field(example="en")


class SpacyOutput(BaseModel):
    text: str = Field(example="I love Hamburg!")
    nes: List[Tuple[str, str]] = Field(example=[("Hamburg", "GPE")])
