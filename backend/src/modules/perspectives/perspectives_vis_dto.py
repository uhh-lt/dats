from pydantic import BaseModel, Field

from modules.perspectives.cluster_dto import ClusterRead


class PerspectivesDoc(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    cluster_id: int = Field(description="ID of the cluster this document belongs to")
    x: float = Field(description="X coordinate of the document in the visualization")
    y: float = Field(description="Y coordinate of the document in the visualization")
    is_accepted: bool = Field(
        description="Indicates whether the document<->cluster assignment is accepted by a user",
    )
    in_searchresult: bool = Field(
        description="Indicates whether the document is part of the search result",
    )
    is_outlier: bool = Field(
        description="Indicates whether the document is an outlier",
    )


class PerspectivesVisualization(BaseModel):
    aspect_id: int = Field(description="ID of the aspect this visualization belongs to")
    clusters: list[ClusterRead] = Field(
        description="List of clusters in the visualization"
    )
    docs: list[PerspectivesDoc] = Field(
        description="List of documents in the visualization",
    )


class PerspectivesClusterSimilarities(BaseModel):
    aspect_id: int = Field(description="ID of the aspect this visualization belongs to")
    clusters: list[ClusterRead] = Field(
        description="List of clusters in the visualization"
    )
    similarities: list[list[float]] = Field(
        description="Matrix of cluster similarities, where similarities[i][j] is the similarity between clusters[i] and clusters[j]",
    )
