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
    CREATE_TOPIC_WITH_NAME = "create_topic_with_name"
    CREATE_TOPIC_WITH_SDOCS = "create_topic_with_sdocs"
    REMOVE_TOPIC = "remove_topic"
    MERGE_TOPICS = "merge_topics"
    SPLIT_TOPIC = "split_topic"
    CHANGE_TOPIC = "change_topic"
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


class CreateTopicWithNameParams(BaseModel):
    tm_job_type: Literal[TMJobType.CREATE_TOPIC_WITH_NAME] = Field(
        default=TMJobType.CREATE_TOPIC_WITH_NAME, description="Type of the TMJob"
    )
    create_dto: TopicCreate = Field(description="DTO for creating a new topic.")


class CreateTopicWithSdocsParams(BaseModel):
    tm_job_type: Literal[TMJobType.CREATE_TOPIC_WITH_SDOCS] = Field(
        default=TMJobType.CREATE_TOPIC_WITH_SDOCS, description="Type of the TMJob"
    )
    aspect_id: int = Field(
        description="ID of the aspect to which documents will be added."
    )
    sdoc_ids: list[int] = Field(
        description="List of source document IDs to include in the topic."
    )


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


class ChangeTopicParams(BaseModel):
    tm_job_type: Literal[TMJobType.CHANGE_TOPIC] = Field(
        default=TMJobType.CHANGE_TOPIC, description="Type of the TMJob"
    )
    aspect_id: int = Field(
        description="ID of the aspect to which the documents belong."
    )
    sdoc_ids: list[int] = Field(
        description="List of source document IDs to change the topic for."
    )
    topic_id: int = Field(
        description="ID of the topic to change to. (-1 will be treated as 'removing' the documents / marking them as outliers)"
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
    CreateTopicWithNameParams,
    CreateTopicWithSdocsParams,
    RemoveTopicParams,
    MergeTopicsParams,
    SplitTopicParams,
    ChangeTopicParams,
    RefineTopicModelParams,
    ResetTopicModelParams,
]

TMJobParams = Union[
    CreateAspectParams,
    AddMissingDocsToAspectParams,
    CreateTopicWithNameParams,
    CreateTopicWithSdocsParams,
    RemoveTopicParams,
    MergeTopicsParams,
    SplitTopicParams,
    ChangeTopicParams,
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
