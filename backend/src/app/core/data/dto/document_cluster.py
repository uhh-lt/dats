from typing import Optional

from pydantic import BaseModel, Field

from .dto_base import UpdateDTOBase


# Properties for creation
class DocumentClusterCreate(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    cluster_id: int = Field(description="ID of the cluster")


# Properties for updating
class DocumentClusterUpdate(BaseModel, UpdateDTOBase):
    cluster_id: Optional[int] = Field(default=None, description="Update the cluster ID")
    is_accepted: Optional[bool] = Field(
        default=None, description="Update the acceptance status"
    )
    distance: Optional[float] = Field(
        default=None, description="Update distance to the assigned cluster"
    )
