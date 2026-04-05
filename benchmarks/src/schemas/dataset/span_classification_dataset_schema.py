from typing import Any, Literal, Sequence

import pandas as pd
from pydantic import Field, field_validator, model_validator

from schemas.dataset.dataset_schema import DatasetConfigBase, read_dataset_columns
from schemas.reference.reference_schema import SpanClassificationReference


class SpanClassificationConfig(DatasetConfigBase):
    """Span classification dataset.

    Exposes a joined `text` prompt variable from token sequences and a `labels`
    variable derived from `id2label` (excluding the `O` label with id 0).
    """

    dataset_type: Literal["span_classification"]
    tokens_column: str = Field(min_length=1)
    tags_column: str = Field(min_length=1)
    id2label: dict[int, str] = Field(min_length=1)

    @field_validator("id2label", mode="before")
    @classmethod
    def normalize_id2label(cls, value: Any) -> dict[int, str]:
        if not isinstance(value, dict):
            raise TypeError("id2label must be a dictionary.")

        normalized: dict[int, str] = {}
        for label_id, label_name in value.items():
            parsed_id = int(label_id)
            parsed_label = str(label_name).strip()
            if not parsed_label:
                raise ValueError("id2label values must be non-empty strings.")
            normalized[parsed_id] = parsed_label

        return normalized

    @staticmethod
    def _normalize_tokens(value: Any) -> list[str]:
        if value is None:
            return []

        if hasattr(value, "tolist"):
            converted = value.tolist()
            if converted is not value:
                return SpanClassificationConfig._normalize_tokens(converted)

        if isinstance(value, str):
            return [token for token in value.split() if token]

        if isinstance(value, (list, tuple)):
            return [str(token) for token in value]

        return [str(value)]

    @staticmethod
    def _normalize_tag_ids(value: Any) -> list[int]:
        if value is None:
            return []

        if hasattr(value, "tolist"):
            converted = value.tolist()
            if converted is not value:
                return SpanClassificationConfig._normalize_tag_ids(converted)

        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []

            if stripped.startswith("[") and stripped.endswith("]"):
                stripped = stripped[1:-1]

            return [int(item.strip()) for item in stripped.split(",") if item.strip()]

        if isinstance(value, (list, tuple)):
            return [int(item) for item in value]

        return [int(value)]

    def get_prompt_column_mapping(self) -> dict[str, str]:
        return {
            "text": self.tokens_column,
        }

    def build_prompt_row_context(self, row: dict[str, Any]) -> dict[str, Any]:
        if self.tokens_column not in row:
            raise ValueError(
                f"Dataset column '{self.tokens_column}' configured for prompt variable 'text' "
                "is missing in row data."
            )

        tokens = self._normalize_tokens(row[self.tokens_column])
        return {
            "text": " ".join(tokens).strip(),
            "labels": [
                self.id2label[label_id]
                for label_id in sorted(self.id2label.keys())
                if label_id != 0
            ],
        }

    def get_references(self, df: pd.DataFrame) -> Sequence[SpanClassificationReference]:
        references: list[SpanClassificationReference] = []

        for _, row in df.iterrows():
            row_data = {str(key): value for key, value in row.to_dict().items()}

            tokens = self._normalize_tokens(row_data[self.tokens_column])
            tag_ids = self._normalize_tag_ids(row_data[self.tags_column])

            if len(tokens) != len(tag_ids):
                raise ValueError(
                    "Span classification requires token and tag sequence lengths to match. "
                    f"Got tokens={len(tokens)} and tags={len(tag_ids)}."
                )

            unknown_label_ids = [
                label_id for label_id in tag_ids if label_id not in self.id2label
            ]
            if unknown_label_ids:
                raise ValueError(
                    "Found unknown tag id(s) in dataset row: "
                    + ", ".join(str(item) for item in sorted(set(unknown_label_ids)))
                )

            references.append(
                SpanClassificationReference(
                    tokens=tokens,
                    tag_ids=tag_ids,
                    id2label=self.id2label,
                )
            )

        return references

    def log_dataset(self, df: pd.DataFrame) -> dict[str, list[Any]]:
        references = self.get_references(df)
        return {
            "tokens": [reference.tokens for reference in references],
            "gold_tags": [
                [reference.id2label[label_id] for label_id in reference.tag_ids]
                for reference in references
            ],
        }

    @model_validator(mode="after")
    def validate_dataset_columns(self) -> "SpanClassificationConfig":
        dataset_columns = read_dataset_columns(self.path)

        if self.tokens_column not in dataset_columns:
            raise ValueError(
                f"tokens_column '{self.tokens_column}' not found in dataset {self.path}."
            )
        if self.tags_column not in dataset_columns:
            raise ValueError(
                f"tags_column '{self.tags_column}' not found in dataset {self.path}."
            )
        if 0 not in self.id2label:
            raise ValueError("id2label must contain label id 0 for the 'O' class.")

        return self
