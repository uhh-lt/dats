import re
from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import pandas as pd
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    classification_report,
    confusion_matrix,
    multilabel_confusion_matrix,
)
from sklearn.preprocessing import MultiLabelBinarizer

from evaluation.artifact_base import BaseArtifactBuilder
from evaluation.eval_utils import (
    extract_labels,
    extract_multilabels,
)
from schemas.answer_schema import (
    BaseAnswerSchema,
    MultiLabelClassificationSchema,
    SingleLabelClassificationSchema,
)


def _slugify(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]+", "_", value).strip("_")


class SingleLabelConfusionMatrixArtifacts(
    BaseArtifactBuilder[SingleLabelClassificationSchema]
):
    def build(
        self,
        predictions: list[BaseAnswerSchema | None],
        references: list[Any],
        output_dir: Path,
        artifact_prefix: str,
    ) -> list[Path]:
        filtered_predictions, filtered_references = self.discard_none_predictions(
            predictions,
            references,
        )
        typed_predictions = self.require_answer_schema(filtered_predictions)

        pred_labels = [
            prediction.get_prediction().strip().lower()
            for prediction in typed_predictions
        ]
        ref_labels = extract_labels(filtered_references, normalize=True)

        if len(pred_labels) == 0:
            return []

        all_labels = sorted({*pred_labels, *ref_labels} - {""})
        if not all_labels:
            return []

        cm = confusion_matrix(ref_labels, pred_labels, labels=all_labels)

        csv_path = output_dir / f"{artifact_prefix}_confusion_matrix.csv"
        png_path = output_dir / f"{artifact_prefix}_confusion_matrix.png"

        pd.DataFrame(
            data=cm,
            index=pd.Index(all_labels),
            columns=pd.Index(all_labels),
        ).to_csv(csv_path)

        fig, ax = plt.subplots(figsize=(max(6, len(all_labels) * 0.65), 6))
        disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=all_labels)
        disp.plot(ax=ax, xticks_rotation="vertical", colorbar=False)
        ax.set_title("Confusion Matrix")
        fig.tight_layout()
        fig.savefig(png_path)
        plt.close(fig)

        return [csv_path, png_path]


class SingleLabelClassificationReportArtifacts(
    BaseArtifactBuilder[SingleLabelClassificationSchema]
):
    def build(
        self,
        predictions: list[BaseAnswerSchema | None],
        references: list[Any],
        output_dir: Path,
        artifact_prefix: str,
    ) -> list[Path]:
        filtered_predictions, filtered_references = self.discard_none_predictions(
            predictions,
            references,
        )
        typed_predictions = self.require_answer_schema(filtered_predictions)

        pred_labels = [
            prediction.get_prediction().strip().lower()
            for prediction in typed_predictions
        ]
        ref_labels = extract_labels(filtered_references, normalize=True)

        if len(pred_labels) == 0:
            return []

        all_labels = sorted({*pred_labels, *ref_labels} - {""})
        if not all_labels:
            return []

        report = classification_report(
            ref_labels,
            pred_labels,
            labels=all_labels,
            target_names=all_labels,
            output_dict=True,
            zero_division=0,
        )

        csv_path = output_dir / f"{artifact_prefix}_classification_report.csv"
        pd.DataFrame(report).transpose().to_csv(csv_path)
        return [csv_path]


class MultiLabelConfusionMatrixArtifacts(
    BaseArtifactBuilder[MultiLabelClassificationSchema]
):
    def build(
        self,
        predictions: list[BaseAnswerSchema | None],
        references: list[Any],
        output_dir: Path,
        artifact_prefix: str,
    ) -> list[Path]:
        filtered_predictions, filtered_references = self.discard_none_predictions(
            predictions,
            references,
        )
        typed_predictions = self.require_answer_schema(filtered_predictions)

        pred_label_lists = [
            [
                label.strip().lower()
                for label in prediction.get_prediction()
                if label.strip()
            ]
            for prediction in typed_predictions
        ]
        ref_label_lists = extract_multilabels(filtered_references, normalize=True)

        if len(pred_label_lists) == 0:
            return []

        label_names = sorted(
            {
                label
                for labels in (pred_label_lists + ref_label_lists)
                for label in labels
                if label
            }
        )
        if not label_names:
            return []

        mlb = MultiLabelBinarizer(classes=label_names)
        mlb.fit([label_names])

        y_true = mlb.transform(ref_label_lists)
        y_pred = mlb.transform(pred_label_lists)
        cms = multilabel_confusion_matrix(
            y_true, y_pred, labels=range(len(label_names))
        )

        artifact_paths: list[Path] = []
        for idx, label_name in enumerate(label_names):
            label_slug = _slugify(label_name)
            csv_path = (
                output_dir / f"{artifact_prefix}_confusion_matrix_{label_slug}.csv"
            )
            png_path = (
                output_dir / f"{artifact_prefix}_confusion_matrix_{label_slug}.png"
            )

            cm = cms[idx]
            pd.DataFrame(
                data=cm,
                index=pd.Index(["actual_negative", "actual_positive"]),
                columns=pd.Index(["pred_negative", "pred_positive"]),
            ).to_csv(csv_path)

            fig, ax = plt.subplots(figsize=(5, 5))
            disp = ConfusionMatrixDisplay(confusion_matrix=cm)
            disp.plot(ax=ax, colorbar=False)
            ax.set_title(f"Confusion Matrix: {label_name}")
            fig.tight_layout()
            fig.savefig(png_path)
            plt.close(fig)

            artifact_paths.extend([csv_path, png_path])

        return artifact_paths


class MultiLabelClassificationReportArtifacts(
    BaseArtifactBuilder[MultiLabelClassificationSchema]
):
    def build(
        self,
        predictions: list[BaseAnswerSchema | None],
        references: list[Any],
        output_dir: Path,
        artifact_prefix: str,
    ) -> list[Path]:
        filtered_predictions, filtered_references = self.discard_none_predictions(
            predictions,
            references,
        )
        typed_predictions = self.require_answer_schema(filtered_predictions)

        pred_label_lists = [
            [
                label.strip().lower()
                for label in prediction.get_prediction()
                if label.strip()
            ]
            for prediction in typed_predictions
        ]
        ref_label_lists = extract_multilabels(filtered_references, normalize=True)

        if len(pred_label_lists) == 0:
            return []

        label_names = sorted(
            {
                label
                for labels in (pred_label_lists + ref_label_lists)
                for label in labels
                if label
            }
        )
        if not label_names:
            return []

        mlb = MultiLabelBinarizer(classes=label_names)
        mlb.fit([label_names])

        y_true = mlb.transform(ref_label_lists)
        y_pred = mlb.transform(pred_label_lists)

        report = classification_report(
            y_true,
            y_pred,
            target_names=label_names,
            output_dict=True,
            zero_division=0,
        )

        csv_path = output_dir / f"{artifact_prefix}_classification_report.csv"
        pd.DataFrame(report).transpose().to_csv(csv_path)
        return [csv_path]
