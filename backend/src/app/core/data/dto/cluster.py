from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from .dto_base import UpdateDTOBase


# Properties for creation
class ClusterCreate(BaseModel):
    parent_cluster_id: Optional[int] = Field(
        default=None, description="ID of the parent cluster, if any"
    )
    aspect_id: int = Field(description="ID of the aspect this cluster belongs to")
    level: int = Field(description="Hierarchical level of the cluster")
    name: str = Field(description="Name of the cluster")
    description: str = Field(description="Description of the cluster")


# Properties for internal creation (if some fields are system-set)
class ClusterCreateIntern(BaseModel):
    aspect_id: int = Field(description="ID of the aspect this cluster belongs to")
    is_outlier: bool = Field(description="Whether the cluster is an outlier")
    level: int = Field(description="Hierarchical level of the cluster")
    name: Optional[str] = Field(default=None, description="Name of the cluster")
    description: Optional[str] = Field(
        default=None, description="Description of the cluster"
    )
    parent_cluster_id: Optional[int] = Field(
        default=None, description="ID of the parent cluster, if any"
    )


# Properties for updating
class ClusterUpdate(BaseModel, UpdateDTOBase):
    pass


# Properties for internal update
class ClusterUpdateIntern(ClusterUpdate):
    parent_cluster_id: Optional[int] = Field(
        default=None, description="Updated ID of the parent cluster"
    )
    name: Optional[str] = Field(default=None, description="New name of the cluster")
    description: Optional[str] = Field(
        default=None, description="New description of the cluster"
    )
    x: Optional[float] = Field(
        default=None, description="Updated X coordinate for visualization"
    )
    y: Optional[float] = Field(
        default=None, description="Updated Y coordinate for visualization"
    )
    top_words: Optional[List[str]] = Field(
        default=None, description="Updated top words for the cluster"
    )
    top_word_scores: Optional[List[float]] = Field(
        default=None, description="Updated scores of the top words"
    )
    top_docs: Optional[List[int]] = Field(
        default=None, description="Updated IDs of top documents for the cluster"
    )


# Properties for reading
class ClusterRead(BaseModel):
    id: int = Field(description="ID of the cluster")
    aspect_id: int = Field(description="ID of the aspect this cluster belongs to")
    parent_cluster_id: Optional[int] = Field(
        description="ID of the parent cluster, if any"
    )

    is_outlier: bool = Field(description="Whether the cluster is an outlier")
    name: str = Field(description="Name of the cluster")
    description: str = Field(description="Description of the cluster")
    level: int = Field(description="Hierarchical level of the cluster")

    x: float = Field(description="X coordinate for visualization")
    y: float = Field(description="Y coordinate for visualization")

    top_words: Optional[List[str]] = Field(
        description="Top words associated with the cluster"
    )
    top_word_scores: Optional[List[float]] = Field(
        description="Scores of the top words"
    )
    top_docs: Optional[List[int]] = Field(
        description="IDs of top documents for the cluster"
    )

    model_config = ConfigDict(from_attributes=True)
