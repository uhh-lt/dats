from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field

from modules.ml.tag_recommendation.tag_recommendation_dto import (
    TagRecommendationMethod,
)
from systems.job_system.job_dto import JobInputBase


class MLJobType(StrEnum):
    QUOTATION_ATTRIBUTION = "QUOTATION_ATTRIBUTION"
    TAG_RECOMMENDATION = "TAG_RECOMMENDATION"
    COREFERENCE_RESOLUTION = "COREFERENCE_RESOLUTION"
    DOCUMENT_EMBEDDING = "DOCUMENT_EMBEDDING"
    SENTENCE_EMBEDDING = "SENTENCE_EMBEDDING"


class QuotationAttributionParams(BaseModel):
    ml_job_type: Literal[MLJobType.QUOTATION_ATTRIBUTION]
    recompute: bool = Field(
        default=False, description="Whether to recompute already processed documents"
    )


class DocTagRecommendationParams(BaseModel):
    ml_job_type: Literal[MLJobType.TAG_RECOMMENDATION]
    multi_class: bool = Field(
        default=False, description="Tags are mutually exclusive if `False`"
    )
    tag_ids: list[int] = Field(
        default=[],
        description="Tags to consider. If empty, all tags applied to any document are considered.",
    )
    method: TagRecommendationMethod = Field(
        default=TagRecommendationMethod.KNN,
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


class SentenceEmbeddingParams(BaseModel):
    ml_job_type: Literal[MLJobType.SENTENCE_EMBEDDING]
    recompute: bool = Field(
        default=False, description="Whether to recompute already processed documents"
    )


class MLJobInput(JobInputBase):
    ml_job_type: MLJobType = Field(description="The type of the MLJob")
    project_id: int = Field(description="The ID of the Project to analyse")
    specific_ml_job_parameters: (
        QuotationAttributionParams
        | DocTagRecommendationParams
        | CoreferenceResolutionParams
        | DocumentEmbeddingParams
        | SentenceEmbeddingParams
        | None
    ) = Field(
        description="Specific parameters for the MLJob w.r.t it's type",
        discriminator="ml_job_type",
    )
