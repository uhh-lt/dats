from __future__ import annotations

from typing import Any, Sequence, cast

from seqeval.metrics import accuracy_score, classification_report, f1_score

from evaluation.metric_base import BaseMetricWrapper
from evaluation.sequential_sentence_classification_utils import (
    build_label_sequences,
    to_bio_format,
)
from schemas.answer_schema import (
    BaseAnswerSchema,
    SequentialSentenceClassificationSchema,
)
from schemas.reference_schema import (
    BaseReferenceSchema,
    SequentialSentenceClassificationReference,
)


class SequentialSentenceClassificationMetrics(
    BaseMetricWrapper[
        SequentialSentenceClassificationSchema,
        SequentialSentenceClassificationReference,
    ]
):
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
            return {
                "precision": 0.0,
                "recall": 0.0,
                "f1": 0.0,
                "accuracy": 0.0,
            }

        gold_sequences, pred_sequences = build_label_sequences(
            predictions=typed_predictions,
            references=typed_references,
        )
        if sum(len(sequence) for sequence in gold_sequences) == 0:
            return {
                "precision": 0.0,
                "recall": 0.0,
                "f1": 0.0,
                "accuracy": 0.0,
            }

        gold_sequences_bio = to_bio_format(gold_sequences)
        pred_sequences_bio = to_bio_format(pred_sequences)

        accuracy = float(accuracy_score(gold_sequences_bio, pred_sequences_bio))
        f1 = float(
            cast(
                float,
                f1_score(gold_sequences_bio, pred_sequences_bio),
            )
        )

        report = classification_report(
            gold_sequences_bio,
            pred_sequences_bio,
            output_dict=True,
        )
        report_dict = cast(dict[str, Any], report)
        weighted_report = cast(dict[str, Any], report_dict.get("weighted avg", {}))

        return {
            "precision": float(weighted_report.get("precision", 0.0)),
            "recall": float(weighted_report.get("recall", 0.0)),
            "f1": f1,
            "accuracy": accuracy,
        }
