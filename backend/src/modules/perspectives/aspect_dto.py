from pydantic import BaseModel, ConfigDict, Field

from repos.db.dto_base import UpdateDTOBase


# Properties shared across all DTOs
class AspectBase(BaseModel):
    name: str = Field(description="Name of the aspect")
    doc_embedding_prompt: str = Field(description="Prompt for document embedding")
    doc_modification_prompt: str | None = Field(
        default=None, description="Prompt for document modification"
    )
    is_hierarchical: bool = Field(description="Whether the aspect is hierarchical")


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
