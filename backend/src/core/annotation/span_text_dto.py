from pydantic import BaseModel, Field


# Properties shared across all DTOs
class SpanTextBaseDTO(BaseModel):
    text: str = Field(description="Text of the SpanText")


# Properties for creation
class SpanTextCreate(SpanTextBaseDTO):
    pass
