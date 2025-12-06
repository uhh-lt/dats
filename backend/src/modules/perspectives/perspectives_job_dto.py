from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field

from modules.perspectives.cluster_dto import ClusterCreate
from systems.job_system.job_dto import JobInputBase, JobRead


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
    RECOMPUTE_CLUSTER_TITLE_AND_DESCRIPTION = "recompute_cluster_title_and_description"
    REVERT = "revert"
    UNDO = "undo"
    REDO = "redo"


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


class UndoParams(BaseModel):
    perspectives_job_type: Literal[PerspectivesJobType.UNDO] = Field(
        default=PerspectivesJobType.UNDO,
        description="Type of the PerspectivesJob",
    )


class RedoParams(BaseModel):
    perspectives_job_type: Literal[PerspectivesJobType.REDO] = Field(
        default=PerspectivesJobType.REDO,
        description="Type of the PerspectivesJob",
    )


class RecomputeClusterTitleAndDescriptionParams(BaseModel):
    perspectives_job_type: Literal[
        PerspectivesJobType.RECOMPUTE_CLUSTER_TITLE_AND_DESCRIPTION
    ] = Field(
        default=PerspectivesJobType.RECOMPUTE_CLUSTER_TITLE_AND_DESCRIPTION,
        description="Type of the PerspectivesJob",
    )
    cluster_id: int = Field(
        description="ID of the cluster to recompute title and description for."
    )


class RevertParams(BaseModel):
    perspectives_job_type: Literal[PerspectivesJobType.REVERT] = Field(
        default=PerspectivesJobType.REVERT,
        description="Type of the PerspectivesJob",
    )
    history_id: int | None = Field(
        description="ID of the history item to revert to. If None, reverts to initial state."
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
    | RecomputeClusterTitleAndDescriptionParams
    | UndoParams
    | RedoParams
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
    | RecomputeClusterTitleAndDescriptionParams
    | UndoParams
    | RedoParams
)


class PerspectivesJobInput(JobInputBase):
    aspect_id: int = Field(
        description="ID of the aspect associated with the PerspectivesJob. -1 if not applicable.",
    )
    perspectives_job_type: PerspectivesJobType = Field(
        description="Type of the PerspectivesJob"
    )
    parameters: PerspectivesJobParams = Field(
        description="Parameters for the PerspectivesJob. The type depends on the PerspectivesJobType.",
        discriminator="perspectives_job_type",
    )


class PerspectivesJobRead(JobRead[PerspectivesJobInput, None]):
    pass
