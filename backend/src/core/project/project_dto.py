from datetime import datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field

from common.feature_enum import Feature, FeatureStatus
from common.job_type_enum import JobType
from core.user.user_dto import UserRead
from repos.db.dto_base import UpdateDTOBase


# Properties shared across all DTOs
class ProjectBaseDTO(BaseModel):
    title: str = Field(description="Title of the Project")
    description: str = Field(description="Description of the Project")


# Properties for creation
class ProjectCreate(ProjectBaseDTO):
    enabled_features: list[Feature] = Field(
        default_factory=lambda: list(Feature),
        description="Features enabled in the Project (default: all); the Features they require are enabled as well",
    )


# Properties for updating
class ProjectUpdate(BaseModel, UpdateDTOBase):
    # NOT NULL columns: omit to keep the value, an explicit null is rejected
    non_nullable_fields: ClassVar[frozenset[str]] = frozenset({"title", "description"})

    title: str | None = Field(description="Title of the Project", default=None)
    description: str | None = Field(
        description="Description of the Project", default=None
    )


# Properties for reading (as in ORM)
class ProjectRead(ProjectBaseDTO):
    id: int = Field(description="ID of the Project")
    created: datetime = Field(description="Created timestamp of the Project")
    updated: datetime = Field(description="Updated timestamp of the Project")
    enabled_features: list[Feature] = Field(
        description="Features enabled in the Project"
    )
    model_config = ConfigDict(from_attributes=True)


class ProjectUserLinks(BaseModel):
    """The complete resulting member list of a Project after a link/unlink operation."""

    project_id: int = Field(description="ID of the Project")
    users: list[UserRead] = Field(
        description="Complete list of Users linked to the Project"
    )


class ProjectFeatureRead(BaseModel):
    """The state of a Feature in a Project."""

    feature: Feature = Field(description="ID of the Feature")
    enabled: bool = Field(description="Whether the Feature is enabled in the Project")
    status: FeatureStatus = Field(
        description="State of the Feature: disabled, computing (documents are processing), partly available (documents lack its data and nothing runs for them) or fully available"
    )
    ready: bool = Field(
        description="Whether all documents the Feature applies to have its data"
    )
    covered_documents: int = Field(
        description="Number of documents the Feature applies to with all its steps finished"
    )
    processing_documents: int = Field(
        description="Number of documents the Feature applies to with a step of it processing"
    )
    failed_documents: int = Field(
        description="Number of documents the Feature applies to with a step of it erroneous and none processing"
    )
    not_planned_documents: int = Field(
        description="Number of documents the Feature applies to with a step of it not planned, and none processing or erroneous"
    )
    total_documents: int = Field(
        description="Number of documents the Feature applies to"
    )
    missing_steps: list[JobType] = Field(
        description="The steps of the Feature that are not finished for at least one document"
    )
