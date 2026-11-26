from pydantic import BaseModel, ConfigDict, Field

from modules.tag_recommendation.tag_recommendation_enum import (
    TagRecommendationMethod,
)
from repos.db.dto_base import UpdateDTOBase
from systems.job_system.job_dto import JobInputBase


class TagRecommendationJobInput(JobInputBase):
    project_id: int = Field(description="The ID of the Project to recommend tags in")
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


class TagRecommendationLinkBaseDTO(BaseModel):
    ml_job_id: str = Field(description="Identifier of the tag recommendation job.")
    source_document_id: int = Field(description="ID of the source document")
    predicted_tag_id: int = Field(description="ID of the predicted tag")
    prediction_score: float = Field(description="Prediction score of the tag")
    is_reviewed: bool = Field(
        description="Reviewed status of the recommendation", default=False
    )


class TagRecommendationLinkCreate(TagRecommendationLinkBaseDTO):
    pass


class TagRecommendationLinkRead(TagRecommendationLinkBaseDTO):
    project_id: int = Field(description="ID of the project of the recommendation")
    model_config = ConfigDict(from_attributes=True)


class TagRecommendationLinkUpdate(BaseModel, UpdateDTOBase):
    # set timestamp in backend
    is_reviewed: bool = Field(description="Reviewed status of the recommendation")


class TagRecommendationResult(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    recommendation_ids: list[int] = Field(
        description="List of the corresponding TagRecommendationLinks"
    )
    current_tag_ids: list[int] = Field(
        description="List of current tag IDs for the source document"
    )
    suggested_tag_ids: list[int] = Field(
        description="List of suggested tag IDs for the source document"
    )
    scores: list[float] = Field(description="List of the scores of the suggested tags")


class TagRecommendationDocumentHit(BaseModel):
    sdoc_id: int = Field(description="ID of the similar source document")
    compared_sdoc_id: int = Field(
        description="ID of the tagged source document it was compared with"
    )
    score: float = Field(description="Similarity of the two documents")
