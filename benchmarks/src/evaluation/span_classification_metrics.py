from __future__ import annotations

from typing import Any, cast

from seqeval.metrics import accuracy_score, classification_report, f1_score

from evaluation.metric_base import BaseMetricWrapper
from evaluation.span_classification_utils import (
    parse_span_reference,
    spans_to_tag_ids,
)
from schemas.answer_schema import BaseAnswerSchema, SpanClassificationSchema


class SpanClassificationMetrics(BaseMetricWrapper[SpanClassificationSchema]):
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
            return {
                "precision": 0.0,
                "recall": 0.0,
                "f1": 0.0,
                "accuracy": 0.0,
            }

        gold_label_sequences: list[list[str]] = []
        predicted_label_sequences: list[list[str]] = []

        for prediction, reference in zip(typed_predictions, filtered_references):
            tokens, gold_tag_ids, id2label, label2id = parse_span_reference(reference)

            predicted_tag_ids = spans_to_tag_ids(
                tokens=tokens,
                predicted_spans=prediction.predictions,
                label2id=label2id,
            )

            gold_label_sequences.append(
                [id2label[label_id] for label_id in gold_tag_ids]
            )
            predicted_label_sequences.append(
                [id2label[label_id] for label_id in predicted_tag_ids]
            )

        accuracy = float(
            accuracy_score(gold_label_sequences, predicted_label_sequences)
        )
        report = classification_report(
            gold_label_sequences,
            predicted_label_sequences,
            output_dict=True,
        )
        report_dict = cast(dict[str, Any], report)
        weighted_report = cast(dict[str, Any], report_dict.get("weighted avg", {}))
        f1 = float(
            cast(
                float,
                f1_score(gold_label_sequences, predicted_label_sequences),
            )
        )

        return {
            "precision": float(weighted_report.get("precision", 0.0)),
            "recall": float(weighted_report.get("recall", 0.0)),
            "f1": f1,
            "accuracy": accuracy,
        }
