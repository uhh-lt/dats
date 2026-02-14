from pydantic import BaseModel, ConfigDict, Field

from repos.db.dto_base import UpdateDTOBase


# Properties for creation
class ClusterCreate(BaseModel):
    aspect_id: int = Field(description="ID of the aspect this cluster belongs to")
    name: str = Field(description="Name of the cluster")
    description: str = Field(description="Description of the cluster")


# Properties for internal creation (if some fields are system-set)
class ClusterCreateIntern(BaseModel):
    aspect_id: int = Field(description="ID of the aspect this cluster belongs to")
    is_outlier: bool = Field(description="Whether the cluster is an outlier")
    name: str | None = Field(default=None, description="Name of the cluster")
    description: str | None = Field(
        default=None, description="Description of the cluster"
    )


# Properties for updating
class ClusterUpdate(BaseModel, UpdateDTOBase):
    name: str | None = Field(default=None, description="New name of the cluster")
    description: str | None = Field(
        default=None, description="New description of the cluster"
    )


# Properties for internal update
class ClusterUpdateIntern(ClusterUpdate):
    # name and description are inherited from ClusterUpdate
    is_user_edited: bool | None = Field(
        default=None,
        description="Whether the cluster name/description was manually edited",
    )
    x: float | None = Field(
        default=None, description="Updated X coordinate for visualization"
    )
    y: float | None = Field(
        default=None, description="Updated Y coordinate for visualization"
    )
    top_words: list[str] | None = Field(
        default=None, description="Updated top words for the cluster"
    )
    top_word_scores: list[float] | None = Field(
        default=None, description="Updated scores of the top words"
    )
    top_docs: list[int] | None = Field(
        default=None, description="Updated IDs of top documents for the cluster"
    )


# Properties for reading
class ClusterRead(BaseModel):
    id: int = Field(description="ID of the cluster")
    aspect_id: int = Field(description="ID of the aspect this cluster belongs to")

    is_outlier: bool = Field(description="Whether the cluster is an outlier")
    name: str = Field(description="Name of the cluster")
    description: str = Field(description="Description of the cluster")

    x: float = Field(description="X coordinate for visualization")
    y: float = Field(description="Y coordinate for visualization")

    top_words: list[str] | None = Field(
        description="Top words associated with the cluster"
    )
    top_word_scores: list[float] | None = Field(description="Scores of the top words")
    top_docs: list[int] | None = Field(
        description="IDs of top documents for the cluster"
    )

    model_config = ConfigDict(from_attributes=True)
