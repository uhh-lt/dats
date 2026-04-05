from __future__ import annotations

from typing import Any, Generic, Sequence, TypeVar

import evaluate

from evaluation.metric_base import BaseMetricWrapper
from schemas.prediction.prediction_schema import BaseAnswerSchema
from schemas.prediction.template_filling_schema import TemplateFillingMUC4AnswerSchemaV1
from schemas.reference.reference_schema import BaseReferenceSchema, MUC4Reference

_NO_ANSWER_MARKERS = {
    "",
    "none",
    "not answerable",
    "nicht beantwortbar",
}


def _normalize_slot_values(value: Any) -> list[str]:
    if value is None:
        return []

    if hasattr(value, "tolist"):
        converted = value.tolist()
        if converted is not value:
            return _normalize_slot_values(converted)

    if isinstance(value, str):
        cleaned = value.strip()
        if cleaned.lower() in _NO_ANSWER_MARKERS:
            return []
        return [cleaned]

    if isinstance(value, (list, tuple, set)):
        normalized: list[str] = []
        for item in value:
            normalized.extend(_normalize_slot_values(item))
        return normalized

    cleaned = str(value).strip()
    if cleaned.lower() in _NO_ANSWER_MARKERS:
        return []
    return [cleaned]


AnswerSchemaT = TypeVar("AnswerSchemaT", bound=BaseAnswerSchema)
ReferenceSchemaT = TypeVar("ReferenceSchemaT", bound=BaseReferenceSchema)


class TemplateFillingMetrics(
    BaseMetricWrapper[AnswerSchemaT, ReferenceSchemaT],
    Generic[AnswerSchemaT, ReferenceSchemaT],
):
    def __init__(self) -> None:
        super().__init__()
        self.metric = evaluate.load("squad_v2")
        self.slots = self._resolve_slots()

    def _resolve_slots(self) -> list[str]:
        answer_fields = set(self.answer_schema_cls.model_fields.keys())
        reference_fields = set(self.reference_schema_cls.model_fields.keys())

        if answer_fields != reference_fields:
            missing_in_reference = sorted(answer_fields - reference_fields)
            missing_in_answer = sorted(reference_fields - answer_fields)
            raise ValueError(
                "Answer schema and reference schema must have exactly the same fields. "
                f"Missing in reference: {missing_in_reference}. "
                f"Missing in answer: {missing_in_answer}."
            )

        if not answer_fields:
            raise ValueError("Template filling schema must define at least one slot.")

        return sorted(answer_fields)

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

        reference_payloads = [reference.model_dump() for reference in typed_references]
        prediction_payloads = [
            prediction.get_prediction() for prediction in typed_predictions
        ]

        exact_scores: list[float] = []
        f1_scores: list[float] = []
        slot_metrics: dict[str, float] = {}

        for slot in self.slots:
            evaluation_predictions: list[dict[str, Any]] = []
            evaluation_references: list[dict[str, Any]] = []

            for idx, (prediction_payload, reference_payload) in enumerate(
                zip(prediction_payloads, reference_payloads)
            ):
                predicted_values = _normalize_slot_values(
                    prediction_payload.get(slot, [])
                )
                reference_values = _normalize_slot_values(
                    reference_payload.get(slot, [])
                )

                has_answer = len(predicted_values) > 0
                evaluation_predictions.append(
                    {
                        "id": str(idx),
                        "prediction_text": predicted_values[0] if has_answer else "",
                        "no_answer_probability": 0.0 if has_answer else 1.0,
                    }
                )
                evaluation_references.append(
                    {
                        "id": str(idx),
                        "answers": {
                            "text": reference_values,
                            "answer_start": [0] * len(reference_values),
                        },
                    }
                )

            results = self.metric.compute(
                predictions=evaluation_predictions,
                references=evaluation_references,
            )
            if results is None:
                raise ValueError("squad_v2 metric returned None.")

            slot_exact = round(float(results.get("exact", 0.0)), 2)
            slot_f1 = round(float(results.get("f1", 0.0)), 2)

            exact_scores.append(slot_exact)
            f1_scores.append(slot_f1)
            slot_metrics[f"{slot}_exact_match"] = slot_exact
            slot_metrics[f"{slot}_f1"] = slot_f1

        avg_exact = round(sum(exact_scores) / len(exact_scores), 2)
        avg_f1 = round(sum(f1_scores) / len(f1_scores), 2)

        return {
            "avg_exact_match": avg_exact,
            "avg_f1": avg_f1,
            **slot_metrics,
        }


class TemplateFillingMUC4Metrics(
    TemplateFillingMetrics[TemplateFillingMUC4AnswerSchemaV1, MUC4Reference]
):
    pass
