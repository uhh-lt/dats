from pydantic import BaseModel, Field

from systems.artefact_system.artefact_dto import ArtefactRead, ProcessingSettings
from systems.feature_system.feature_system_enum import FeatureArea, FeatureStatus


class FeatureRead(BaseModel):
    feature: str = Field(description="Name of the Feature")
    title: str = Field(description="Title of the Feature")
    description: str = Field(description="Description of the Feature")
    area: FeatureArea = Field(description="Area of the Feature")
    default_enabled: bool = Field(
        description="Whether a new Project enables the Feature unless the request names its Features"
    )
    artefacts: list[ArtefactRead] = Field(
        description="The Artefacts the Feature requires besides the core Artefacts: what enabling it computes"
    )


class ProjectFeatureRead(BaseModel):
    """The state of a Feature in a Project."""

    feature: str = Field(description="Name of the Feature")
    enabled: bool = Field(description="Whether the Feature is enabled in the Project")
    status: FeatureStatus = Field(
        description="State of the Feature: disabled, computing (documents are processing or being planned), partly available (documents lack its data and nothing runs for them) or fully available"
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
    lacking_documents: int = Field(
        description="Number of documents the Feature applies to that lack its data and for which nothing runs (failed plus not planned)"
    )
    total_documents: int = Field(
        description="Number of documents the Feature applies to"
    )


class FeatureActivation(BaseModel):
    """The settings to enable or complete a Feature with."""

    settings: ProcessingSettings = Field(
        description="The processing settings of the computed steps"
    )
