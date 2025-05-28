from enum import Enum
from typing import Literal, Optional, Union

from app.core.data.dto.background_job_base import (
    BackgroundJobBaseCreate,
    BackgroundJobBaseRead,
    BackgroundJobBaseUpdate,
)
from app.core.data.dto.topic import TopicCreate
from pydantic import BaseModel, Field


class TMJobType(str, Enum):
    CREATE_ASPECT = "create_aspect"
    ADD_MISSING_DOCS_TO_ASPECT = "add_missing_docs_to_aspect"
    ADD_TOPIC = "add_topic"
    REMOVE_TOPIC = "remove_topic"
    MERGE_TOPICS = "merge_topics"
    SPLIT_TOPIC = "split_topic"
    REFINE_TOPIC_MODEL = "refine_topic_model"
    RESET_TOPIC_MODEL = "reset_topic_model"


class CreateAspectParams(BaseModel):
    tm_job_type: Literal[TMJobType.CREATE_ASPECT] = Field(
        default=TMJobType.CREATE_ASPECT, description="Type of the TMJob"
    )
    aspect_id: int = Field(description="ID of the created aspect.")


class AddMissingDocsToAspectParams(BaseModel):
    tm_job_type: Literal[TMJobType.ADD_MISSING_DOCS_TO_ASPECT] = Field(
        default=TMJobType.ADD_MISSING_DOCS_TO_ASPECT, description="Type of the TMJob"
    )
    aspect_id: int = Field(
        description="ID of the aspect to which documents will be added."
    )


class AddTopicParams(BaseModel):
    tm_job_type: Literal[TMJobType.ADD_TOPIC] = Field(
        default=TMJobType.ADD_TOPIC, description="Type of the TMJob"
    )
    create_dto: TopicCreate = Field(description="DTO for creating a new topic.")


class RemoveTopicParams(BaseModel):
    tm_job_type: Literal[TMJobType.REMOVE_TOPIC] = Field(
        default=TMJobType.REMOVE_TOPIC, description="Type of the TMJob"
    )
    topic_id: int = Field(description="ID of the topic to remove.")


class MergeTopicsParams(BaseModel):
    tm_job_type: Literal[TMJobType.MERGE_TOPICS] = Field(
        default=TMJobType.MERGE_TOPICS, description="Type of the TMJob"
    )
    topic_to_keep: int = Field(description="ID of the topic to keep after merging.")
    topic_to_merge: int = Field(description="ID of the topic to delete after merging.")


class SplitTopicParams(BaseModel):
    tm_job_type: Literal[TMJobType.SPLIT_TOPIC] = Field(
        default=TMJobType.SPLIT_TOPIC, description="Type of the TMJob"
    )
    topic_id: int = Field(description="ID of the topic to split.")
    split_into: Optional[int] = Field(
        description="Number of topics to split the topic into. Must be greater than 1. If not set, the topic will be split automatically."
    )


class RefineTopicModelParams(BaseModel):
    tm_job_type: Literal[TMJobType.REFINE_TOPIC_MODEL] = Field(
        default=TMJobType.REFINE_TOPIC_MODEL, description="Type of the TMJob"
    )
    aspect_id: int = Field(description="ID of the aspect to refine.")


class ResetTopicModelParams(BaseModel):
    tm_job_type: Literal[TMJobType.RESET_TOPIC_MODEL] = Field(
        default=TMJobType.RESET_TOPIC_MODEL, description="Type of the TMJob"
    )
    aspect_id: int = Field(description="ID of the aspect to reset.")


TMJobParamsNoCreate = Union[
    AddMissingDocsToAspectParams,
    AddTopicParams,
    RemoveTopicParams,
    MergeTopicsParams,
    SplitTopicParams,
    RefineTopicModelParams,
    ResetTopicModelParams,
]

TMJobParams = Union[
    CreateAspectParams,
    AddMissingDocsToAspectParams,
    AddTopicParams,
    RemoveTopicParams,
    MergeTopicsParams,
    SplitTopicParams,
    RefineTopicModelParams,
    ResetTopicModelParams,
]


class TMJobBase(BaseModel):
    step: int = Field(
        description="Current step of the TMJob. Starts at 0 and increments with each major step.",
    )
    steps: list[str] = Field(
        description="List of steps that the TMJob consists of. Each step is a string describing the action taken.",
    )
    status_msg: str = Field(description="Status message of the TMJob")
    tm_job_type: TMJobType = Field(description="Type of the TMJob")
    parameters: TMJobParams = Field(
        description="Parameters for the TMJob. The type depends on the TMJobType.",
        discriminator="tm_job_type",
    )


class TMJobCreate(BackgroundJobBaseCreate, TMJobBase):
    pass


class TMJobUpdate(BackgroundJobBaseUpdate):
    step: Optional[int] = Field(
        default=None,
        description="Current step of the TMJob. Starts at 0 and increments with each major step.",
    )
    status_msg: Optional[str] = Field(
        default=None, description="Status message of the TMJob"
    )


class TMJobRead(BackgroundJobBaseRead, TMJobBase):
    pass


# TMJobRead is stored in Redis:
# id: str
# project_id: int
# created: datetime
# updated: datetime
# status: BackgroundJobStatus
#
# step: int
# steps: List[str]
# status_msg: str
# tm_job_type: TMJobType
# parameters: TMJobParams
