from pydantic import BaseModel, Field

from repos.db.dto_base import UpdateDTOBase


# Properties for creation
class DocumentClusterCreate(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    cluster_id: int = Field(description="ID of the cluster")


# Properties for updating
class DocumentClusterUpdate(BaseModel, UpdateDTOBase):
    cluster_id: int | None = Field(default=None, description="Update the cluster ID")
    is_accepted: bool | None = Field(
        default=None, description="Update the acceptance status"
    )
    similarity: float | None = Field(
        default=None, description="Update distance to the assigned cluster"
    )
