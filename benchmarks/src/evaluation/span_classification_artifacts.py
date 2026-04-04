from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd
from seqeval.metrics import classification_report

from evaluation.artifact_base import BaseArtifactBuilder
from evaluation.span_classification_utils import (
    parse_span_reference,
    spans_to_tag_ids,
)
from schemas.answer_schema import BaseAnswerSchema, SpanClassificationSchema


class SpanClassificationReportArtifacts(BaseArtifactBuilder[SpanClassificationSchema]):
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

        if len(typed_predictions) == 0:
            return []

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

        report = classification_report(
            gold_label_sequences,
            predicted_label_sequences,
            output_dict=True,
        )
        csv_path = output_dir / f"{artifact_prefix}_span_classification_report.csv"
        pd.DataFrame(report).transpose().to_csv(csv_path)
        return [csv_path]
