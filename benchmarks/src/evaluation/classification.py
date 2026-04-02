from typing import Any

from sklearn.metrics import accuracy_score, precision_recall_fscore_support

from evaluation.base import BaseMetricWrapper
from evaluation.metrics_utils import (
    extract_labels,
)


class StandardClassificationMetrics(BaseMetricWrapper):
    def compute(
        self, predictions: list[Any], references: list[Any]
    ) -> dict[str, float]:
        pred_labels = extract_labels(predictions, label_field=self.label_field)
        ref_labels = extract_labels(references, label_field=self.label_field)

        n = min(len(pred_labels), len(ref_labels))
        if n == 0:
            return {
                "accuracy": 0.0,
                "macro_precision": 0.0,
                "macro_recall": 0.0,
                "macro_f1": 0.0,
            }

        pred_labels = pred_labels[:n]
        ref_labels = ref_labels[:n]

        accuracy = accuracy_score(ref_labels, pred_labels)
        precision, recall, f1, _ = precision_recall_fscore_support(
            ref_labels,
            pred_labels,
            average="macro",
            zero_division=0,
        )

        return {
            "accuracy": float(accuracy),
            "macro_precision": float(precision),
            "macro_recall": float(recall),
            "macro_f1": float(f1),
        }
