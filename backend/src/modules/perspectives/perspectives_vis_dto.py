from pydantic import BaseModel, Field

from core.search.sdoc_search.sdoc_search_columns import SdocColumns
from modules.perspectives.cluster_dto import ClusterRead
from systems.search_system.filtering import Filter
from systems.search_system.sorting import Sort


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


class VisualizationRequest(BaseModel):
    search_query: str = Field(
        description="Full-text query that marks the matching documents"
    )
    filter: Filter[SdocColumns] = Field(description="Column filter tree")
    sorts: list[Sort[SdocColumns]] = Field(
        default=[], description="Ordered sort expressions"
    )


class LabelDocumentsRequest(VisualizationRequest):
    sdoc_ids: list[int] = Field(description="The SourceDocuments whose labels change")
