from typing import Sequence

from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sklearn.preprocessing import MultiLabelBinarizer

from evaluation.metric_base import BaseMetricWrapper
from schemas.prediction.prediction_schema import (
    BaseAnswerSchema,
    MultiLabelClassificationSchema,
    SingleLabelClassificationSchema,
)
from schemas.reference.reference_schema import (
    BaseReferenceSchema,
    MultiLabelReference,
    SingleLabelReference,
)


class StandardClassificationMetrics(
    BaseMetricWrapper[SingleLabelClassificationSchema, SingleLabelReference]
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

        pred_labels = [
            prediction.get_prediction().strip().lower()
            for prediction in typed_predictions
        ]
        ref_labels = [reference.label.strip().lower() for reference in typed_references]

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


class WeightedClassificationMetrics(
    BaseMetricWrapper[SingleLabelClassificationSchema, SingleLabelReference]
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

        pred_labels = [
            prediction.get_prediction().strip().lower()
            for prediction in typed_predictions
        ]
        ref_labels = [reference.label.strip().lower() for reference in typed_references]

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
            zero_division=0,
        )

        return {
            "weighted_precision": float(precision),
            "weighted_recall": float(recall),
            "weighted_f1": float(f1),
            "weighted_accuracy": float(accuracy),
        }


class MultiLabelClassificationMetrics(
    BaseMetricWrapper[MultiLabelClassificationSchema, MultiLabelReference]
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

        pred_labels = [
            [
                label.strip().lower()
                for label in prediction.get_prediction()
                if label.strip()
            ]
            for prediction in typed_predictions
        ]
        ref_labels = [
            [label.strip().lower() for label in reference.labels if label.strip()]
            for reference in typed_references
        ]

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
            zero_division=0,
        )
        subset_accuracy = accuracy_score(y_true, y_pred)

        return {
            "weighted_precision": float(precision),
            "weighted_recall": float(recall),
            "weighted_f1": float(f1),
            "subset_accuracy": float(subset_accuracy),
        }
