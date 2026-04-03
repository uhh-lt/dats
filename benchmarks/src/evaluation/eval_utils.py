from typing import Any

from pydantic import BaseModel


def assert_no_none_and_equal_length(
    predictions: list[Any], references: list[Any], *, context: str
) -> None:
    none_prediction_indices = [
        idx for idx, value in enumerate(predictions) if value is None
    ]
    none_reference_indices = [
        idx for idx, value in enumerate(references) if value is None
    ]

    assert not none_prediction_indices, (
        f"{context}: predictions contain None values at indices "
        f"{none_prediction_indices[:10]}"
    )
    assert not none_reference_indices, (
        f"{context}: references contain None values at indices "
        f"{none_reference_indices[:10]}"
    )
    assert len(predictions) == len(references), (
        f"{context}: predictions and references must have identical length, "
        f"got len(predictions)={len(predictions)} and len(references)={len(references)}"
    )


def _normalize_label(value: str) -> str:
    return value.strip().lower()


def _to_label(value: Any, normalize: bool = False) -> str:
    if value is None:
        return ""

    if isinstance(value, (list, tuple, set)):
        label = ", ".join(str(item) for item in value)
    else:
        label = str(value)

    return _normalize_label(label) if normalize else label


def _extract_value_from_item(item: Any, label_field: str) -> Any:
    if item is None:
        return None

    if isinstance(item, str):
        return item

    if isinstance(item, BaseModel):
        data = item.model_dump()
        value = data.get(label_field)
        if value is None and data:
            value = next(iter(data.values()))
        return value

    if isinstance(item, dict):
        value = item.get(label_field)
        if value is None and item:
            value = next(iter(item.values()))
        return value

    return getattr(item, label_field, None)


def _to_label_list(value: Any, normalize: bool = False) -> list[str]:
    if value is None:
        return []

    if isinstance(value, str):
        labels = [part.strip() for part in value.split(",") if part.strip()]
    elif isinstance(value, (list, tuple, set)):
        labels = [str(item).strip() for item in value if str(item).strip()]
    else:
        labels = [str(value).strip()] if str(value).strip() else []

    if normalize:
        return [_normalize_label(label) for label in labels]

    return labels


def extract_labels(
    predictions: list[Any], label_field: str, normalize: bool = False
) -> list[str]:
    return [
        _to_label(
            _extract_value_from_item(item, label_field=label_field),
            normalize=normalize,
        )
        for item in predictions
    ]


def extract_multilabels(
    predictions: list[Any], label_field: str, normalize: bool = False
) -> list[list[str]]:
    return [
        _to_label_list(
            _extract_value_from_item(item, label_field=label_field),
            normalize=normalize,
        )
        for item in predictions
    ]
