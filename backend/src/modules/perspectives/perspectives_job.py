from enum import Enum
from typing import Literal

from modules.perspectives.cluster_dto import ClusterCreate
from pydantic import BaseModel, Field
from systems.job_system.background_job_base_dto import (
    BackgroundJobBaseCreate,
    BackgroundJobBaseRead,
    BackgroundJobBaseUpdate,
)


class PerspectivesJobType(str, Enum):
    CREATE_ASPECT = "create_aspect"
    ADD_MISSING_DOCS_TO_ASPECT = "add_missing_docs_to_aspect"
    CREATE_CLUSTER_WITH_NAME = "create_cluster_with_name"
    CREATE_CLUSTER_WITH_SDOCS = "create_cluster_with_sdocs"
    REMOVE_CLUSTER = "remove_cluster"
    MERGE_CLUSTERS = "merge_clusters"
    SPLIT_CLUSTER = "split_cluster"
    CHANGE_CLUSTER = "change_cluster"
    REFINE_MODEL = "refine_model"
    RESET_MODEL = "reset_model"


class CreateAspectParams(BaseModel):
    perspectives_job_type: Literal[PerspectivesJobType.CREATE_ASPECT] = Field(
        default=PerspectivesJobType.CREATE_ASPECT,
        description="Type of the PerspectivesJob",
    )


class AddMissingDocsToAspectParams(BaseModel):
    perspectives_job_type: Literal[PerspectivesJobType.ADD_MISSING_DOCS_TO_ASPECT] = (
        Field(
            default=PerspectivesJobType.ADD_MISSING_DOCS_TO_ASPECT,
            description="Type of the PerspectivesJob",
        )
    )


class CreateClusterWithNameParams(BaseModel):
    perspectives_job_type: Literal[PerspectivesJobType.CREATE_CLUSTER_WITH_NAME] = (
        Field(
            default=PerspectivesJobType.CREATE_CLUSTER_WITH_NAME,
            description="Type of the PerspectivesJob",
        )
    )
    create_dto: ClusterCreate = Field(description="DTO for creating a new cluster.")


class CreateClusterWithSdocsParams(BaseModel):
    perspectives_job_type: Literal[PerspectivesJobType.CREATE_CLUSTER_WITH_SDOCS] = (
        Field(
            default=PerspectivesJobType.CREATE_CLUSTER_WITH_SDOCS,
            description="Type of the PerspectivesJob",
        )
    )
    sdoc_ids: list[int] = Field(
        description="List of source document IDs to include in the cluster."
    )


class RemoveClusterParams(BaseModel):
    perspectives_job_type: Literal[PerspectivesJobType.REMOVE_CLUSTER] = Field(
        default=PerspectivesJobType.REMOVE_CLUSTER,
        description="Type of the PerspectivesJob",
    )
    cluster_id: int = Field(description="ID of the cluster to remove.")


class MergeClustersParams(BaseModel):
    perspectives_job_type: Literal[PerspectivesJobType.MERGE_CLUSTERS] = Field(
        default=PerspectivesJobType.MERGE_CLUSTERS,
        description="Type of the PerspectivesJob",
    )
    cluster_to_keep: int = Field(description="ID of the cluster to keep after merging.")
    cluster_to_merge: int = Field(
        description="ID of the cluster to delete after merging."
    )


class SplitClusterParams(BaseModel):
    perspectives_job_type: Literal[PerspectivesJobType.SPLIT_CLUSTER] = Field(
        default=PerspectivesJobType.SPLIT_CLUSTER,
        description="Type of the PerspectivesJob",
    )
    cluster_id: int = Field(description="ID of the cluster to split.")
    split_into: int | None = Field(
        description="Number of clusters to split the cluster into. Must be greater than 1. If not set, the cluster will be split automatically."
    )


class ChangeClusterParams(BaseModel):
    perspectives_job_type: Literal[PerspectivesJobType.CHANGE_CLUSTER] = Field(
        default=PerspectivesJobType.CHANGE_CLUSTER,
        description="Type of the PerspectivesJob",
    )
    sdoc_ids: list[int] = Field(
        description="List of source document IDs to change the cluster for."
    )
    cluster_id: int = Field(
        description="ID of the cluster to change to. (-1 will be treated as 'removing' the documents / marking them as outliers)"
    )


class RefineModelParams(BaseModel):
    perspectives_job_type: Literal[PerspectivesJobType.REFINE_MODEL] = Field(
        default=PerspectivesJobType.REFINE_MODEL,
        description="Type of the PerspectivesJob",
    )


class ResetModelParams(BaseModel):
    perspectives_job_type: Literal[PerspectivesJobType.RESET_MODEL] = Field(
        default=PerspectivesJobType.RESET_MODEL,
        description="Type of the PerspectivesJob",
    )


PerspectivesJobParamsNoCreate = (
    AddMissingDocsToAspectParams
    | CreateClusterWithNameParams
    | CreateClusterWithSdocsParams
    | RemoveClusterParams
    | MergeClustersParams
    | SplitClusterParams
    | ChangeClusterParams
    | RefineModelParams
    | ResetModelParams
)

PerspectivesJobParams = (
    CreateAspectParams
    | AddMissingDocsToAspectParams
    | CreateClusterWithNameParams
    | CreateClusterWithSdocsParams
    | RemoveClusterParams
    | MergeClustersParams
    | SplitClusterParams
    | ChangeClusterParams
    | RefineModelParams
    | ResetModelParams
)


class PerspectivesJobBase(BaseModel):
    step: int = Field(
        description="Current step of the PerspectivesJob. Starts at 0 and increments with each major step.",
    )
    steps: list[str] = Field(
        description="List of steps that the PerspectivesJob consists of. Each step is a string describing the action taken.",
    )
    status_msg: str = Field(description="Status message of the PerspectivesJob")
    perspectives_job_type: PerspectivesJobType = Field(
        description="Type of the PerspectivesJob"
    )
    aspect_id: int = Field(
        description="ID of the aspect associated with the PerspectivesJob. -1 if not applicable.",
    )
    parameters: PerspectivesJobParams = Field(
        description="Parameters for the PerspectivesJob. The type depends on the PerspectivesJobType.",
        discriminator="perspectives_job_type",
    )


class PerspectivesJobCreate(BackgroundJobBaseCreate, PerspectivesJobBase):
    pass


class PerspectivesJobUpdate(BackgroundJobBaseUpdate):
    step: int | None = Field(
        default=None,
        description="Current step of the PerspectivesJob. Starts at 0 and increments with each major step.",
    )
    status_msg: str | None = Field(
        default=None, description="Status message of the PerspectivesJob"
    )


class PerspectivesJobRead(BackgroundJobBaseRead, PerspectivesJobBase):
    pass


# PerspectivesJobRead is stored in Redis:
# id: str
# project_id: int
# created: datetime
# updated: datetime
# status: BackgroundJobStatus
#
# aspect_id: int
# step: int
# steps: list[str]
# status_msg: str
# perspectives_job_type: PerspectivesJobType
# parameters: PerspectivesJobParams
