from typing import Any, cast

from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sklearn.preprocessing import MultiLabelBinarizer

from evaluation.eval_utils import (
    assert_no_none_and_equal_length,
    extract_labels,
    extract_multilabels,
)
from evaluation.metric_base import BaseMetricWrapper


class StandardClassificationMetrics(BaseMetricWrapper):
    def compute(
        self, predictions: list[Any], references: list[Any]
    ) -> dict[str, float]:
        pred_labels = extract_labels(
            predictions, label_field=self.label_field, normalize=True
        )
        ref_labels = extract_labels(
            references, label_field=self.label_field, normalize=True
        )
        assert_no_none_and_equal_length(
            pred_labels,
            ref_labels,
            context=self.__class__.__name__,
        )

        if len(pred_labels) == 0:
            return {
                "accuracy": 0.0,
                "macro_precision": 0.0,
                "macro_recall": 0.0,
                "macro_f1": 0.0,
            }

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


class WeightedClassificationMetrics(BaseMetricWrapper):
    def compute(
        self, predictions: list[Any], references: list[Any]
    ) -> dict[str, float]:
        pred_labels = extract_labels(
            predictions, label_field=self.label_field, normalize=True
        )
        ref_labels = extract_labels(
            references, label_field=self.label_field, normalize=True
        )
        assert_no_none_and_equal_length(
            pred_labels,
            ref_labels,
            context=self.__class__.__name__,
        )

        if len(pred_labels) == 0:
            return {
                "weighted_precision": 0.0,
                "weighted_recall": 0.0,
                "weighted_f1": 0.0,
                "weighted_accuracy": 0.0,
            }

        accuracy = accuracy_score(ref_labels, pred_labels)
        precision, recall, f1, _ = precision_recall_fscore_support(
            ref_labels,
            pred_labels,
            average="weighted",
            zero_division=cast(Any, 0),
        )

        return {
            "weighted_precision": float(precision),
            "weighted_recall": float(recall),
            "weighted_f1": float(f1),
            "weighted_accuracy": float(accuracy),
        }


class MultiLabelClassificationMetrics(BaseMetricWrapper):
    def compute(
        self, predictions: list[Any], references: list[Any]
    ) -> dict[str, float]:
        pred_labels = extract_multilabels(
            predictions,
            label_field=self.label_field,
            normalize=True,
        )
        ref_labels = extract_multilabels(
            references,
            label_field=self.label_field,
            normalize=True,
        )
        assert_no_none_and_equal_length(
            pred_labels,
            ref_labels,
            context=self.__class__.__name__,
        )

        if len(pred_labels) == 0:
            return {
                "weighted_precision": 0.0,
                "weighted_recall": 0.0,
                "weighted_f1": 0.0,
                "subset_accuracy": 0.0,
            }

        label_names = sorted(
            {
                label
                for labels in (pred_labels + ref_labels)
                for label in labels
                if label
            }
        )
        if not label_names:
            return {
                "weighted_precision": 0.0,
                "weighted_recall": 0.0,
                "weighted_f1": 0.0,
                "subset_accuracy": 0.0,
            }

        mlb = MultiLabelBinarizer(classes=label_names)
        mlb.fit([label_names])
        y_true = mlb.transform(ref_labels)
        y_pred = mlb.transform(pred_labels)

        precision, recall, f1, _ = precision_recall_fscore_support(
            y_true,
            y_pred,
            average="weighted",
            zero_division=cast(Any, 0),
        )
        subset_accuracy = accuracy_score(y_true, y_pred)

        return {
            "weighted_precision": float(precision),
            "weighted_recall": float(recall),
            "weighted_f1": float(f1),
            "subset_accuracy": float(subset_accuracy),
        }
