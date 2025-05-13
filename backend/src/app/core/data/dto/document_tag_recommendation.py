from typing import List

from pydantic import BaseModel, ConfigDict, Field

from app.core.data.dto.dto_base import UpdateDTOBase


class DocumentTagRecommendationLinkBaseDTO(BaseModel):
    ml_job_id: str = Field(description="Identifier of the corresponding ML Job.")
    source_document_id: int = Field(description="ID of the source document")
    predicted_tag_id: int = Field(description="ID of the predicted tag")
    prediction_score: float = Field(description="Prediction score of the tag")
    is_reviewed: bool = Field(
        description="Reviewed status of the recommendation", default=False
    )


class DocumentTagRecommendationLinkCreate(DocumentTagRecommendationLinkBaseDTO):
    pass


class DocumentTagRecommendationLinkRead(DocumentTagRecommendationLinkBaseDTO):
    model_config = ConfigDict(from_attributes=True)


class DocumentTagRecommendationLinkUpdate(BaseModel, UpdateDTOBase):
    # set timestamp in backend
    is_reviewed: bool = Field(description="Reviewed status of the recommendation")


class DocumentTagRecommendationResult(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    recommendation_ids: List[int] = Field(
        description="List of the corresponding DocumentTagRecommendationLinks"
    )
    current_tag_ids: List[int] = Field(
        description="List of current tag IDs for the source document"
    )
    suggested_tag_ids: List[int] = Field(
        description="List of suggested tag IDs for the source document"
    )
    scores: List[float] = Field(description="List of the scores of the suggested tags")
