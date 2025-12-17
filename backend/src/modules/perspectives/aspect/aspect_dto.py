import srsly
from pydantic import BaseModel, ConfigDict, Field, field_validator

from common.doc_type import DocType
from repos.db.dto_base import UpdateDTOBase


class PipelineSettings(BaseModel):
    """
    Settings for the perspective creation pipeline.
    When updating these settings, make sure to also update the frontend default settings! (PerspectiveCreationDialog.tsx)
    """

    umap_n_neighbors: int = Field(
        default=15, description="Number of neighbors for UMAP dimensionality reduction"
    )
    umap_n_components: int = Field(
        default=10, description="Number of components for UMAP dimensionality reduction"
    )
    umap_min_dist: float = Field(
        default=0.1, description="Minimum distance for UMAP dimensionality reduction"
    )
    umap_metric: str = Field(
        default="cosine", description="Metric for UMAP dimensionality reduction"
    )
    hdbscan_min_cluster_size: int = Field(
        default=10, description="Minimum cluster size for HDBSCAN clustering"
    )
    hdbscan_metric: str = Field(
        default="euclidean", description="Metric for HDBSCAN clustering"
    )
    num_keywords: int = Field(
        default=50, description="Number of keywords to extract per cluster"
    )
    num_top_documents: int = Field(
        default=5, description="Number of top documents to extract per cluster"
    )


# Properties shared across all DTOs
class AspectBase(BaseModel):
    name: str = Field(description="Name of the aspect")
    doc_embedding_prompt: str = Field(description="Prompt for document embedding")
    doc_modification_prompt: str | None = Field(
        default=None, description="Prompt for document modification"
    )
    is_hierarchical: bool = Field(description="Whether the aspect is hierarchical")
    modality: DocType = Field(description="Modality of the documents of this aspect")
    pipeline_settings: PipelineSettings = Field(
        description="Pipeline settings for this aspect"
    )
    tag_id: int | None = Field(
        default=None, description="ID of the tag associated with this aspect."
    )

    @field_validator("pipeline_settings", mode="before")
    def json_loads_settings(cls, v) -> PipelineSettings:
        if v is None:
            return PipelineSettings()
        if isinstance(v, str):
            data = srsly.json_loads(v)
            if not isinstance(data, dict):
                raise ValueError(
                    "Invalid JSON for pipeline_settings. Must be a JSON object."
                )
            return PipelineSettings(**data)
        if isinstance(v, dict):
            return PipelineSettings(**v)
        return v


# Properties for creation
class AspectCreate(AspectBase):
    project_id: int = Field(description="ID of the project this aspect belongs to")


# Properties for updating
class AspectUpdate(BaseModel, UpdateDTOBase):
    name: str | None = Field(default=None, description="New name of the aspect")


# Properties for internal update
class AspectUpdateIntern(AspectUpdate):
    embedding_model: str | None = Field(
        default=None, description="Updated embedding model"
    )
    most_recent_job_id: str | None = Field(
        default=None, description="ID of the most recent job associated with the aspect"
    )


# Properties for reading (as in ORM)
class AspectRead(AspectBase):
    id: int = Field(description="ID of the aspect")
    project_id: int = Field(description="ID of the project this aspect belongs to")
    most_recent_job_id: str | None = Field(
        default=None, description="ID of the most recent job associated with the aspect"
    )

    model_config = ConfigDict(from_attributes=True)
