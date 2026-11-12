from pydantic import BaseModel, Field

from common.feature_enum import Feature, FeatureStatus
from common.job_type_enum import JobType
from modules.doc_processing.doc_processing_dto import ProcessingSettings


class ProjectFeatureRead(BaseModel):
    """The state of a Feature in a Project."""

    feature: Feature = Field(description="ID of the Feature")
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
    total_documents: int = Field(
        description="Number of documents the Feature applies to"
    )
    missing_steps: list[JobType] = Field(
        description="The steps of the Feature that are not finished for at least one document"
    )


class FeatureActivation(BaseModel):
    """Enable a Feature, or complete it: compute its data for the documents that lack it."""

    settings: ProcessingSettings = Field(
        description="The processing settings of the computed steps"
    )
