from __future__ import annotations

from typing import Sequence

from schemas.answer_schema import SequentialSentenceClassificationSchema
from schemas.reference_schema import SequentialSentenceClassificationReference


def _normalize_label(label: str) -> str:
    return label.strip().lower()


def _parse_classification(classification: str, allowed_labels: set[str]) -> str:
    normalized = _normalize_label(classification)
    if normalized not in allowed_labels:
        return "o"
    return normalized


def _prediction_to_label_sequence(
    prediction: SequentialSentenceClassificationSchema,
    sentence_count: int,
    allowed_labels: set[str],
) -> list[str]:
    predicted_by_id: dict[int, str] = {}

    for annotation in prediction.annotations:
        if annotation.text_id < 1:
            continue
        predicted_by_id[annotation.text_id] = _parse_classification(
            annotation.category,
            allowed_labels,
        )

    return [predicted_by_id.get(index + 1, "o") for index in range(sentence_count)]


def _filter_unwanted_labels(
    golds: list[list[str]],
    preds: list[list[str]],
    unwanted_labels: set[str],
) -> tuple[list[list[str]], list[list[str]]]:
    if not unwanted_labels:
        return golds, preds

    golds_filtered: list[list[str]] = []
    preds_filtered: list[list[str]] = []

    for gold_sequence, pred_sequence in zip(golds, preds):
        filtered_gold_sequence: list[str] = []
        filtered_pred_sequence: list[str] = []

        for gold_label, pred_label in zip(gold_sequence, pred_sequence):
            if gold_label in unwanted_labels:
                continue
            filtered_gold_sequence.append(gold_label)
            filtered_pred_sequence.append(pred_label)

        golds_filtered.append(filtered_gold_sequence)
        preds_filtered.append(filtered_pred_sequence)

    return golds_filtered, preds_filtered


def to_bio_format(label_sequences: list[list[str]]) -> list[list[str]]:
    bio_sequences: list[list[str]] = []

    for label_sequence in label_sequences:
        bio_sequence: list[str] = []
        previous_label = "o"

        for label in label_sequence:
            if label == "o":
                bio_sequence.append("O")
            elif label != previous_label:
                bio_sequence.append(f"B-{label}")
            else:
                bio_sequence.append(f"I-{label}")

            previous_label = label

        bio_sequences.append(bio_sequence)

    return bio_sequences


def build_label_sequences(
    predictions: Sequence[SequentialSentenceClassificationSchema],
    references: Sequence[SequentialSentenceClassificationReference],
) -> tuple[list[list[str]], list[list[str]]]:
    unwanted_labels = {
        _normalize_label(unwanted_label)
        for reference in references
        for unwanted_label in reference.unwanted_labels
        if _normalize_label(unwanted_label)
    }

    allowed_labels = {
        _normalize_label(label)
        for reference in references
        for label in reference.labels
        if _normalize_label(label) and _normalize_label(label) not in unwanted_labels
    }

    gold_sequences: list[list[str]] = []
    pred_sequences: list[list[str]] = []

    for prediction, reference in zip(predictions, references):
        normalized_gold_labels = [_normalize_label(label) for label in reference.labels]
        sentence_count = len(reference.sentences)

        gold_sequence = normalized_gold_labels
        pred_sequence = _prediction_to_label_sequence(
            prediction,
            sentence_count,
            allowed_labels,
        )

        gold_sequences.append(gold_sequence)
        pred_sequences.append(pred_sequence)

    return _filter_unwanted_labels(gold_sequences, pred_sequences, unwanted_labels)
