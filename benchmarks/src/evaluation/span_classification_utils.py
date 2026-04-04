from __future__ import annotations

import json
from typing import Any

from schemas.answer_schema import SpanPrediction
from schemas.reference_schema import SpanClassificationReference


def normalize_label_name(label: str) -> str:
    cleaned = label.strip()

    if cleaned.startswith("<") and cleaned.endswith(">") and len(cleaned) > 2:
        cleaned = cleaned[1:-1]

    if cleaned.startswith("**") and cleaned.endswith("**") and len(cleaned) > 4:
        cleaned = cleaned[2:-2]

    return cleaned.strip().lower()


def normalize_tokens(value: Any) -> list[str]:
    if value is None:
        return []

    if hasattr(value, "tolist"):
        converted = value.tolist()
        if converted is not value:
            return normalize_tokens(converted)

    if isinstance(value, str):
        return [token for token in value.split() if token]

    if isinstance(value, (list, tuple)):
        return [str(token) for token in value]

    return [str(value)]


def normalize_tag_ids(value: Any) -> list[int]:
    if value is None:
        return []

    if hasattr(value, "tolist"):
        converted = value.tolist()
        if converted is not value:
            return normalize_tag_ids(converted)

    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return []

        try:
            decoded = json.loads(stripped)
            if isinstance(decoded, list):
                return [int(item) for item in decoded]
        except json.JSONDecodeError:
            pass

        return [int(item.strip()) for item in stripped.split(",") if item.strip()]

    if isinstance(value, (list, tuple)):
        return [int(item) for item in value]

    return [int(value)]


def parse_span_reference(
    reference: SpanClassificationReference,
) -> tuple[list[str], list[int], dict[int, str], dict[str, int]]:
    tokens = normalize_tokens(reference.tokens)
    tag_ids = normalize_tag_ids(reference.tag_ids)
    id2label = {
        int(label_id): str(label_name)
        for label_id, label_name in reference.id2label.items()
    }

    if 0 not in id2label:
        id2label[0] = "O"

    if len(tokens) != len(tag_ids):
        raise ValueError(
            "Span reference tokens and tag_ids must have the same length. "
            f"Got tokens={len(tokens)} and tag_ids={len(tag_ids)}."
        )

    unknown_ids = [label_id for label_id in tag_ids if label_id not in id2label]
    if unknown_ids:
        raise ValueError(
            "Span reference contains unknown tag id(s): "
            + ", ".join(str(value) for value in sorted(set(unknown_ids)))
        )

    label2id = {
        normalize_label_name(label): label_id for label_id, label in id2label.items()
    }

    return tokens, tag_ids, id2label, label2id


def spans_to_tag_ids(
    tokens: list[str],
    predicted_spans: list[SpanPrediction],
    label2id: dict[str, int],
) -> list[int]:
    predicted_tag_ids = [0] * len(tokens)

    for span in predicted_spans:
        label = normalize_label_name(span.category)
        text = span.text.strip()

        if not label or not text or label not in label2id:
            continue

        span_tokens = text.split()
        if not span_tokens:
            continue

        span_length = len(span_tokens)
        for start_idx in range(len(tokens)):
            if start_idx + span_length > len(tokens):
                break

            if tokens[start_idx : start_idx + span_length] == span_tokens:
                predicted_tag_ids[start_idx : start_idx + span_length] = [
                    label2id[label]
                ] * span_length

    return predicted_tag_ids
