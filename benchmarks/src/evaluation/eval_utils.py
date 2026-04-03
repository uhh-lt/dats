from typing import Any


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


def extract_labels(values: list[Any], normalize: bool = False) -> list[str]:
    return [
        _to_label(
            item,
            normalize=normalize,
        )
        for item in values
    ]


def extract_multilabels(values: list[Any], normalize: bool = False) -> list[list[str]]:
    return [
        _to_label_list(
            item,
            normalize=normalize,
        )
        for item in values
    ]
