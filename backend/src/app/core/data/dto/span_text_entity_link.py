from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SpanTextEntityLinkCreate(BaseModel):
    linked_entity_id: Optional[int] = Field(description="ID of the linked Entity.")
    linked_span_text_id: Optional[int] = Field(
        description="ID of the linked span text."
    )


class SpanTextEntityLinkUpdate(BaseModel):
    linked_entity_id: Optional[int] = Field(description="ID of the linked Entity.")
    linked_span_text_id: Optional[int] = Field(
        description="ID of the linked span text."
    )


class SpanTextEntityLinkRead(BaseModel):
    id: int = Field(description="ID of the SpanTextEntityLink")
    linked_entity_id: Optional[int] = Field(description="ID of the linked Entity.")
    linked_span_text_id: Optional[int] = Field(
        description="ID of the linked span text."
    )
    model_config = ConfigDict(from_attributes=True)
