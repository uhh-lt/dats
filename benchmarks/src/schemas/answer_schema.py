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
