from typing import Literal

from pydantic import BaseModel, Field


class NewsgroupClassificationSchemaV1(BaseModel):
    reasoning: str = Field(
        description="Short explanation of why this category was selected."
    )
    category: Literal[
        "alt.atheism",
        "comp.graphics",
        "sci.space",
        "talk.politics.mideast",
    ] = Field(description="The predicted category for the input document.")
