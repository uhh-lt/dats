from __future__ import annotations

from typing import Any, Sequence

import evaluate

from evaluation.metric_base import BaseMetricWrapper
from schemas.prediction.prediction_schema import (
    BaseAnswerSchema,
    ExtractiveQASchema,
)
from schemas.reference.reference_schema import (
    BaseReferenceSchema,
    ExtractiveQAReference,
)

_NO_ANSWER_MARKERS = ("not answerable", "nicht beantwortbar")


def _is_no_answer(answer: str) -> bool:
    normalized = answer.strip().lower()
    if not normalized:
        return False
    return normalized in _NO_ANSWER_MARKERS


class ExtractiveQASquad2Metrics(
    BaseMetricWrapper[ExtractiveQASchema, ExtractiveQAReference]
):
    def __init__(self) -> None:
        super().__init__()
        self.metric = evaluate.load("squad_v2")

    def compute(
        self,
        predictions: list[BaseAnswerSchema | None],
        references: Sequence[BaseReferenceSchema],
    ) -> dict[str, float]:
        filtered_predictions, filtered_references = self.discard_none_predictions(
            predictions,
            references,
        )
        typed_predictions = self.require_answer_schema(filtered_predictions)
        typed_references = self.require_reference_schema(filtered_references)

        if len(typed_predictions) == 0:
            raise ValueError("predictions and references must not be empty.")

        evaluation_predictions: list[dict[str, Any]] = []
        evaluation_references: list[dict[str, Any]] = []

        for parsed_object, reference in zip(typed_predictions, typed_references):
            answer = parsed_object.get_prediction()

            no_answer_probability = 1.0 if _is_no_answer(answer) else 0.0

            evaluation_predictions.append(
                {
                    "id": reference.id,
                    "prediction_text": "" if no_answer_probability == 1.0 else answer,
                    "no_answer_probability": no_answer_probability,
                }
            )
            evaluation_references.append(reference.model_dump())

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
