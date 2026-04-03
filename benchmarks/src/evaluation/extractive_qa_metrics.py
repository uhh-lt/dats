from __future__ import annotations

from typing import Any

import evaluate
from pydantic import BaseModel, Field, model_validator

from evaluation.metric_base import BaseMetricWrapper
from schemas.answer_schema import BaseAnswerSchema, ExtractiveQASchema

_NO_ANSWER_MARKERS = ("not answerable", "nicht beantwortbar")


class SquadReferenceAnswers(BaseModel):
    text: list[str] = Field(default_factory=list)
    answer_start: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_lengths(self) -> "SquadReferenceAnswers":
        if len(self.text) != len(self.answer_start):
            raise ValueError(
                "answers.text and answers.answer_start must have equal length."
            )
        return self


class SquadReferenceAnswer(BaseModel):
    id: str = Field(min_length=1)
    answers: SquadReferenceAnswers


def _parse_reference_payload(reference: Any) -> SquadReferenceAnswer:
    if isinstance(reference, str):
        return SquadReferenceAnswer.model_validate_json(reference)

    if isinstance(reference, BaseModel):
        return SquadReferenceAnswer.model_validate(reference.model_dump())

    if isinstance(reference, dict):
        return SquadReferenceAnswer.model_validate(reference)

    raise TypeError(
        "Reference must be a JSON string, dict, or pydantic model for SquadReferenceAnswer parsing."
    )


def _is_no_answer(answer: str) -> bool:
    normalized = answer.strip().lower()
    if not normalized:
        return False
    return normalized in _NO_ANSWER_MARKERS


class ExtractiveQASquad2Metrics(BaseMetricWrapper[ExtractiveQASchema]):
    def __init__(self) -> None:
        self.metric = evaluate.load("squad_v2")

    def compute(
        self,
        predictions: list[BaseAnswerSchema | None],
        references: list[Any],
    ) -> dict[str, float]:
        filtered_predictions, filtered_references = self.discard_none_predictions(
            predictions,
            references,
        )
        typed_predictions = self.require_answer_schema(filtered_predictions)

        if len(typed_predictions) == 0:
            raise ValueError("predictions and references must not be empty.")

        evaluation_predictions: list[dict[str, Any]] = []
        evaluation_references: list[dict[str, Any]] = []

        for parsed_object, reference in zip(typed_predictions, filtered_references):
            answer = parsed_object.get_prediction()
            reference_payload = _parse_reference_payload(reference)

            no_answer_probability = 1.0 if _is_no_answer(answer) else 0.0

            evaluation_predictions.append(
                {
                    "id": reference_payload.id,
                    "prediction_text": "" if no_answer_probability == 1.0 else answer,
                    "no_answer_probability": no_answer_probability,
                }
            )
            evaluation_references.append(reference_payload.model_dump())

        results = self.metric.compute(
            predictions=evaluation_predictions,
            references=evaluation_references,
        )
        if results is None:
            raise ValueError("squad_v2 metric returned None.")

        exact = float(results.get("exact", 0.0))
        f1 = float(results.get("f1", 0.0))

        return {
            "exact_match": round(exact, 2),
            "f1": round(f1, 2),
        }
