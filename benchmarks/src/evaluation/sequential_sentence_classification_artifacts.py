from __future__ import annotations

from pathlib import Path
from typing import Sequence

import pandas as pd
from seqeval.metrics import classification_report

from evaluation.artifact_base import BaseArtifactBuilder
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


class SequentialSentenceClassificationReportArtifacts(
    BaseArtifactBuilder[
        SequentialSentenceClassificationSchema,
        SequentialSentenceClassificationReference,
    ]
):
    def build(
        self,
        predictions: list[BaseAnswerSchema | None],
        references: Sequence[BaseReferenceSchema],
        output_dir: Path,
        artifact_prefix: str,
    ) -> list[Path]:
        filtered_predictions, filtered_references = self.discard_none_predictions(
            predictions,
            references,
        )
        typed_predictions = self.require_answer_schema(filtered_predictions)
        typed_references = self.require_reference_schema(filtered_references)

        if len(typed_predictions) == 0:
            return []

        gold_sequences, pred_sequences = build_label_sequences(
            predictions=typed_predictions,
            references=typed_references,
        )
        if sum(len(sequence) for sequence in gold_sequences) == 0:
            return []

        gold_sequences_bio = to_bio_format(gold_sequences)
        pred_sequences_bio = to_bio_format(pred_sequences)

        report = classification_report(
            gold_sequences_bio,
            pred_sequences_bio,
            output_dict=True,
        )
        csv_path = (
            output_dir
            / f"{artifact_prefix}_sequential_sentence_classification_report.csv"
        )
        pd.DataFrame(report).transpose().to_csv(csv_path)

        return [csv_path]
