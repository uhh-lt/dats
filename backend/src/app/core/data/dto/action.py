from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ActionType(int, Enum):
    CREATE = 0
    UPDATE = 1
    DELETE = 2


class ActionTargetObjectType(str, Enum):
    memo = 'memo'
    annotation_document = 'annotation_document'
    source_document = 'source_document'
    code = 'code'
    span_annotation = 'span_annotation'
    span_group = 'span_group'
    bbox_annotation = 'bbox_annotation'
    project = 'project'
    document_tag = 'document_tag'


# Properties shared across all DTOs
class ActionBaseDTO(BaseModel):
    action_type: ActionType = Field(description='TODO')


# Properties for creation
class ActionCreate(ActionBaseDTO):
    user_id: int = Field(description='User the Memo belongs to')
    project_id: int = Field(description='Project the Memo belongs to')


# Properties to read
class ActionReadBaseDTO(ActionBaseDTO):
    id: int = Field(description='ID of the Memo')
    user_id: int = Field(description='User the Memo belongs to')
    project_id: int = Field(description='Project the Memo belongs to')
    executed: datetime = Field(description="Updated timestamp of the Memo")


class ActionRead(ActionReadBaseDTO):
    target_id: int = Field(description='ID of the Object the Memo is attached to')
    target_object_type: ActionTargetObjectType = Field(description='Type of the Object the ID refers to')


# Properties in DB (as in ORM)
class ActionInDB(ActionReadBaseDTO):
    target_id: int = Field(description='The ObjectHandle the Memo is attached to')

    class Config:
        orm_mode = True
