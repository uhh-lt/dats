from pydantic import BaseModel, Field

from common.feature_enum import Feature
from common.job_type_enum import JobType
from modules.doc_processing.doc_processing_dto import ProcessingSettings
from systems.job_system.job_dto import JobInputBase


class FeatureRead(BaseModel):
    feature: Feature = Field(description="ID of the Feature")
    title: str = Field(description="Title of the Feature")
    description: str = Field(description="Description of the Feature")
    requires_features: list[Feature] = Field(
        description="The Features this Feature requires (directly); enabling it enables them"
    )


class FeatureActivation(BaseModel):
    """Enable a Feature, or complete it: compute its data for the documents that lack it."""

    settings: ProcessingSettings = Field(
        description="The processing settings of the computed steps"
    )


class FeatureActivationJobInput(JobInputBase):
    sdoc_steps: dict[int, list[JobType]] = Field(
        description="The newly planned steps to start per SourceDocument ID; their inputs are finished"
    )
    settings: ProcessingSettings = Field(
        description="The processing settings of the started steps"
    )
