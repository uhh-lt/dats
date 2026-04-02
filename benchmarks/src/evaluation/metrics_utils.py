from typing import Any

from pydantic import BaseModel


def _to_label(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def _extract_label_from_item(item: Any, label_field: str) -> str:
    if item is None:
        return ""

    if isinstance(item, str):
        return item

    if isinstance(item, BaseModel):
        data = item.model_dump()
        value = data.get(label_field)
        if value is None and data:
            value = next(iter(data.values()))
        return _to_label(value)

    if isinstance(item, dict):
        value = item.get(label_field)
        if value is None and item:
            value = next(iter(item.values()))
        return _to_label(value)

    value = getattr(item, label_field, None)
    return _to_label(value)


def extract_labels(predictions: list[Any], label_field: str) -> list[str]:
    return [
        _extract_label_from_item(item, label_field=label_field) for item in predictions
    ]
