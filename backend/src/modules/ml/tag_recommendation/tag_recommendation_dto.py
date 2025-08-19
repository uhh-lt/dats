from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from repos.db.dto_base import UpdateDTOBase


class TagRecommendationLinkBaseDTO(BaseModel):
    ml_job_id: str = Field(description="Identifier of the corresponding ML Job.")
    source_document_id: int = Field(description="ID of the source document")
    predicted_tag_id: int = Field(description="ID of the predicted tag")
    prediction_score: float = Field(description="Prediction score of the tag")
    is_reviewed: bool = Field(
        description="Reviewed status of the recommendation", default=False
    )


class TagRecommendationLinkCreate(TagRecommendationLinkBaseDTO):
    pass


class TagRecommendationLinkRead(TagRecommendationLinkBaseDTO):
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


class TagRecommendationMethod(StrEnum):
    SIMPLE = "SIMPLE"
    KNN = "KNN"
    EXCLUSIVE = "EXCLUSIVE"
