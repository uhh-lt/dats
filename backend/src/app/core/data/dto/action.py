from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class ActionType(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"


class ActionTargetObjectType(str, Enum):
    memo = "memo"
    annotation_document = "annotation_document"
    source_document = "source_document"
    code = "code"
    span_annotation = "span_annotation"
    span_group = "span_group"
    bbox_annotation = "bbox_annotation"
    project = "project"
    document_tag = "document_tag"


# Properties shared across all DTOs
class ActionBaseDTO(BaseModel):
    action_type: ActionType = Field(description="Type of the Action")
    target_id: int = Field(description="ID of the Target of the Action")
    target_type: ActionTargetObjectType = Field(
        description="Type of the Target the target_id refers to"
    )
    before_state: Optional[str] = Field(
        description="The before state of the target object in JSON.", default=None
    )
    after_state: Optional[str] = Field(
        description="The after state of the target object in JSON.", default=None
    )


# Properties for creation
class ActionCreate(ActionBaseDTO):
    user_id: int = Field(description="User the Memo belongs to")
    project_id: int = Field(description="Project the Memo belongs to")


# Properties to read
class ActionRead(ActionBaseDTO):
    id: int = Field(description="ID of the Action")
    user_id: int = Field(description="User the Action belongs to")
    project_id: int = Field(description="Project the Action belongs to")
    executed: datetime = Field(description="Executed timestamp of the Action")

    class Config:
        orm_mode = True


class ActionQueryParameters(BaseModel):
    proj_id: int = Field(description="ID of the Project")
    user_ids: List[int] = Field(description="IDs of the Users")
    action_types: List[ActionType] = Field(description="Types of the Actions")
    action_targets: List[ActionTargetObjectType] = Field(
        description="Types of the Action Targets"
    )
    timestamp_from: int = Field(description="Start date of the Actions")
    timestamp_to: int = Field(description="End date of the Actions")
