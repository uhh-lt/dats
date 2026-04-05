from typing import Any, Literal, Sequence

import pandas as pd
from pydantic import Field, model_validator

from schemas.dataset.dataset_schema import DatasetConfigBase, read_dataset_columns
from schemas.reference.reference_schema import SequentialSentenceClassificationReference


class SequentialSentenceClassificationConfig(DatasetConfigBase):
    """Sequential sentence classification dataset.

    Exposes a numbered `document` prompt variable built from sentence sequences
    and stores one label per sentence for seqeval-style evaluation.
    """

    dataset_type: Literal["sequential_sentence_classification"]
    sentences_column: str = Field(min_length=1)
    labels_column: str = Field(min_length=1)
    unwanted_labels: list[str] = Field(default_factory=list)

    @staticmethod
    def _normalize_sentences(value: Any) -> list[str]:
        if value is None:
            return []

        if hasattr(value, "tolist"):
            converted = value.tolist()
            if converted is not value:
                return SequentialSentenceClassificationConfig._normalize_sentences(
                    converted
                )

        if isinstance(value, str):
            return [value]

        if isinstance(value, (list, tuple)):
            return [str(item) for item in value]

        return [str(value)]

    @staticmethod
    def _normalize_labels(value: Any) -> list[str]:
        if value is None:
            return []

        if hasattr(value, "tolist"):
            converted = value.tolist()
            if converted is not value:
                return SequentialSentenceClassificationConfig._normalize_labels(
                    converted
                )

        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            if stripped.startswith("[") and stripped.endswith("]"):
                stripped = stripped[1:-1]
                return [
                    item.strip().strip("'").strip('"')
                    for item in stripped.split(",")
                    if item.strip()
                ]
            return [stripped]

        if isinstance(value, (list, tuple)):
            return [str(item).strip() for item in value]

        return [str(value).strip()]

    def get_prompt_column_mapping(self) -> dict[str, str]:
        return {
            "document": self.sentences_column,
        }

    def build_prompt_row_context(self, row: dict[str, Any]) -> dict[str, Any]:
        if self.sentences_column not in row:
            raise ValueError(
                f"Dataset column '{self.sentences_column}' configured for prompt variable 'document' "
                "is missing in row data."
            )

        sentences = self._normalize_sentences(row[self.sentences_column])
        document = "\n".join(
            f"{index + 1}: {sentence}" for index, sentence in enumerate(sentences)
        )
        return {
            "document": document,
        }

    def get_references(
        self, df: pd.DataFrame
    ) -> Sequence[SequentialSentenceClassificationReference]:
        references: list[SequentialSentenceClassificationReference] = []

        normalized_unwanted_labels = [
            label.strip().lower() for label in self.unwanted_labels if label.strip()
        ]

        for _, row in df.iterrows():
            row_data = {str(key): value for key, value in row.to_dict().items()}

            sentences = self._normalize_sentences(row_data[self.sentences_column])
            labels = [
                label.lower()
                for label in self._normalize_labels(row_data[self.labels_column])
            ]

            if len(sentences) != len(labels):
                raise ValueError(
                    "Sequential sentence classification requires sentence and label sequence lengths to match. "
                    f"Got sentences={len(sentences)} and labels={len(labels)}."
                )

            references.append(
                SequentialSentenceClassificationReference(
                    sentences=sentences,
                    labels=labels,
                    unwanted_labels=normalized_unwanted_labels,
                )
            )

        return references

    def log_dataset(self, df: pd.DataFrame) -> dict[str, list[Any]]:
        references = self.get_references(df)
        return {
            "sentences": [reference.sentences for reference in references],
            "gold_labels": [reference.labels for reference in references],
        }

    @model_validator(mode="after")
    def validate_dataset_columns(self) -> "SequentialSentenceClassificationConfig":
        dataset_columns = read_dataset_columns(self.path)

        if self.sentences_column not in dataset_columns:
            raise ValueError(
                f"sentences_column '{self.sentences_column}' not found in dataset {self.path}."
            )
        if self.labels_column not in dataset_columns:
            raise ValueError(
                f"labels_column '{self.labels_column}' not found in dataset {self.path}."
            )

        return self
