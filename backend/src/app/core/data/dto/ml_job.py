from datetime import datetime
from enum import StrEnum
from typing import Literal, Optional, Union

from pydantic import BaseModel, Field

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.document_tag_recommendation import (
    DocumentTagRecommendationMethod,
)


class MLJobType(StrEnum):
    QUOTATION_ATTRIBUTION = "QUOTATION_ATTRIBUTION"
    DOC_TAG_RECOMMENDATION = "DOC_TAG_RECOMMENDATION"
    COREFERENCE_RESOLUTION = "COREFERENCE_RESOLUTION"
    DOCUMENT_EMBEDDING = "DOCUMENT_EMBEDDING"


class QuotationAttributionParams(BaseModel):
    ml_job_type: Literal[MLJobType.QUOTATION_ATTRIBUTION]
    recompute: bool = Field(
        default=False, description="Whether to recompute already processed documents"
    )


class DocTagRecommendationParams(BaseModel):
    ml_job_type: Literal[MLJobType.DOC_TAG_RECOMMENDATION]
    multi_class: bool = Field(
        default=False, description="Tags are mutually exclusive if `False`"
    )
    tag_ids: list[int] = Field(
        default=[],
        description="Tags to consider. If empty, all tags applied to any document are considered.",
    )
    method: DocumentTagRecommendationMethod = Field(
        default=DocumentTagRecommendationMethod.KNN,
        description="Method to use for suggestions",
    )


class CoreferenceResolutionParams(BaseModel):
    ml_job_type: Literal[MLJobType.COREFERENCE_RESOLUTION]
    recompute: bool = Field(
        default=False, description="Whether to recompute already processed documents"
    )


class DocumentEmbeddingParams(BaseModel):
    ml_job_type: Literal[MLJobType.DOCUMENT_EMBEDDING]
    recompute: bool = Field(
        default=False, description="Whether to recompute already processed documents"
    )


class MLJobParameters(BaseModel):
    ml_job_type: MLJobType = Field(description="The type of the MLJob")
    project_id: int = Field(description="The ID of the Project to analyse")
    specific_ml_job_parameters: Union[
        QuotationAttributionParams,
        DocTagRecommendationParams,
        CoreferenceResolutionParams,
        DocumentEmbeddingParams,
        None,
    ] = Field(
        description="Specific parameters for the MLJob w.r.t it's type",
        discriminator="ml_job_type",
    )


class MLJobBase(BaseModel):
    status: BackgroundJobStatus = Field(
        default=BackgroundJobStatus.WAITING, description="Status of the MLJob"
    )
    error: Optional[str] = Field(default=None, description="Error message (if any)")


class MLJobRead(MLJobBase):
    id: str = Field(description="ID of the MLJob")
    created: datetime = Field(description="Created timestamp of the MLJob")
    updated: datetime = Field(description="Updated timestamp of the MLJob")
    parameters: MLJobParameters = Field(
        description="The parameters of the MLJob that defines what to do!"
    )


class MLJobCreate(MLJobBase):
    parameters: MLJobParameters = Field(
        description="The parameters of the MLJob that defines what to do!"
    )


class MLJobUpdate(MLJobBase):
    pass
