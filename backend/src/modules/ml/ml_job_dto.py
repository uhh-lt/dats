from typing import Literal

from pydantic import BaseModel, Field

from modules.ml.ml_enum import MLJobType
from systems.job_system.job_dto import JobInputBase


class QuotationAttributionParams(BaseModel):
    ml_job_type: Literal[MLJobType.QUOTATION_ATTRIBUTION] = Field(
        description="The type of the MLJob"
    )
    recompute: bool = Field(
        default=False, description="Whether to recompute already processed documents"
    )


class CoreferenceResolutionParams(BaseModel):
    ml_job_type: Literal[MLJobType.COREFERENCE_RESOLUTION] = Field(
        description="The type of the MLJob"
    )
    recompute: bool = Field(
        default=False, description="Whether to recompute already processed documents"
    )


class MLJobInput(JobInputBase):
    ml_job_type: MLJobType = Field(description="The type of the MLJob")
    project_id: int = Field(description="The ID of the Project to analyse")
    specific_ml_job_parameters: (
        QuotationAttributionParams | CoreferenceResolutionParams | None
    ) = Field(
        description="Specific parameters for the MLJob w.r.t it's type",
        discriminator="ml_job_type",
    )
