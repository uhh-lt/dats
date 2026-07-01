from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field, model_validator


class BaseAnswerSchema(BaseModel, ABC):
    @abstractmethod
    def get_prediction(self) -> Any:
        """Return the prediction payload used for evaluation and logging."""

    @model_validator(mode="after")
    def validate_prediction_present(self) -> "BaseAnswerSchema":
        prediction = self.get_prediction()

        if prediction is None:
            raise ValueError("Prediction must not be None.")

        if isinstance(prediction, str) and not prediction.strip():
            raise ValueError("Prediction must not be empty.")

        if isinstance(prediction, (list, tuple, set)) and len(prediction) == 0:
            raise ValueError("Prediction list must not be empty.")

        return self


class SingleLabelClassificationSchema(BaseAnswerSchema):
    category: str = Field(min_length=1)

    def get_prediction(self) -> str:
        return self.category


class MultiLabelClassificationSchema(BaseAnswerSchema):
    categories: list[str] = Field(min_length=1)

    def get_prediction(self) -> list[str]:
        return [str(category) for category in self.categories]


class ExtractiveQASchema(BaseAnswerSchema):
    answer: str = Field(min_length=1)

    def get_prediction(self) -> str:
        return self.answer


class SpanPrediction(BaseModel):
    category: str = Field(
        min_length=1,
        description="Predicted category label for the extracted text span.",
    )
    text: str = Field(
        min_length=1,
        description="Text span extracted verbatim from the input text.",
    )


class SpanClassificationSchema(BaseAnswerSchema):
    predictions: list[SpanPrediction] = Field(
        default_factory=list,
        description=(
            "List of extracted spans. Each item must include 'category' and 'text'."
        ),
    )

    def get_prediction(self) -> dict[str, list[dict[str, str]]]:
        return {
            "predictions": [
                {
                    "category": prediction.category,
                    "text": prediction.text,
                }
                for prediction in self.predictions
            ]
        }


class SequentialSentenceAnnotation(BaseModel):
    text_id: int = Field(
        ge=1,
        description="1-based sentence id that maps to the numbered sentence in the prompt.",
    )
    category: str = Field(
        min_length=1,
        description="Predicted category label for the referenced sentence.",
    )
    reason: str | None = Field(
        default=None,
        description="Optional rationale for the predicted category.",
    )


class SequentialSentenceClassificationSchema(BaseAnswerSchema):
    annotations: list[SequentialSentenceAnnotation] = Field(
        default_factory=list,
        description="Per-sentence predictions identified by text_id.",
    )

    def get_prediction(self) -> dict[str, list[dict[str, str | int | None]]]:
        return {
            "annotations": [
                {
                    "text_id": annotation.text_id,
                    "category": annotation.category,
                    "reason": annotation.reason,
                }
                for annotation in self.annotations
            ]
        }
