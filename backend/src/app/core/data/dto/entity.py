from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict, Field

from app.core.data.dto.span_text import SpanTextRead

from .dto_base import UpdateDTOBase


# Properties shared across all DTOs
class EntityBaseDTO(BaseModel):
    pass


# Properties for creation
class EntityCreate(EntityBaseDTO):
    name: str = Field(description="Name of the Entity")
    project_id: int = Field(description="Project the Entity belongs to")
    span_text_ids: List[int] = Field(
        description="Span Text Ids which belong to this Entity"
    )


# Properties for updating
class EntityUpdate(EntityBaseDTO, UpdateDTOBase):
    name: str = Field(description="Name of the Entity")
    span_text_ids: List[int] = Field(
        description="Span Text Ids which belong to this Entity"
    )
    pass


class EntityMark(EntityBaseDTO):
    span_text_id: int = Field(description="Span Text Id to mark")
    project_id: int = Field(description="Project the Entity belongs to")


class EntityMerge(EntityBaseDTO):
    name: str = Field(description="Name of the Entity")
    project_id: int = Field(description="Id of the current Project")
    entity_ids: List[int] = Field(description="List of Entity IDs to merge")
    spantext_ids: List[int] = Field(description="List of Span Text IDs to merge")


class EntityResolve(EntityBaseDTO):
    project_id: int = Field(description="Id of the current Project")
    entity_ids: List[int] = Field(description="List of Entity IDs to merge")
    spantext_ids: List[int] = Field(description="List of Span Text IDs to merge")


class EntityRelease(EntityBaseDTO):
    name: str = Field(description="Name of the Entity")
    entity_ids: List[int] = Field(description="List of Entity IDs to merge")
    spantext_ids: List[int] = Field(description="List of Span Text IDs to merge")


# Properties for reading (as in ORM)
class EntityRead(EntityBaseDTO):
    id: int = Field(description="ID of the Entity")
    name: str = Field(description="Name of the Entity")
    project_id: int = Field(description="Project the Entity belongs to")
    created: datetime = Field(description="Created timestamp of the Entity")
    updated: datetime = Field(description="Updated timestamp of the Entity")
    span_texts: List[SpanTextRead] = Field(
        default=[], description="The SpanTexts belonging to this entity"
    )
    model_config = ConfigDict(from_attributes=True)  # TODO ask tim what this does
