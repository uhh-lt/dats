from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ActionType(str, Enum):
    CREATE = 'CREATE'
    UPDATE = 'UPDATE'
    DELETE = 'DELETE'


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
    action_type: ActionType = Field(description='Type of the Action')
    target_id: int = Field(description='ID of the Target of the Action')
    target_type: ActionTargetObjectType = Field(description='Type of the Target the target_id refers to')


# Properties for creation
class ActionCreate(ActionBaseDTO):
    user_id: int = Field(description='User the Memo belongs to')
    project_id: int = Field(description='Project the Memo belongs to')


# Properties to read
class ActionRead(ActionBaseDTO):
    id: int = Field(description='ID of the Action')
    user_id: int = Field(description='User the Action belongs to')
    project_id: int = Field(description='Project the Action belongs to')
    executed: datetime = Field(description="Executed timestamp of the Action")

    class Config:
        orm_mode = True
