from typing import Any, Literal, Sequence

import pandas as pd
from pydantic import Field, model_validator

from schemas.dataset.dataset_schema import DatasetConfigBase, read_dataset_columns
from schemas.reference.reference_schema import MUC4Reference


class TemplateFillingDatasetConfig(DatasetConfigBase):
    """Template filling dataset.

    Makes `context` prompt variable available from `context_column` and builds
    structured slot references from `slot_columns`.
    """

    dataset_type: Literal["template_filling"]
    context_column: str = Field(min_length=1)
    slot_columns: dict[str, str] = Field(min_length=1)

    @staticmethod
    def _normalize_slot_values(value: Any) -> list[str]:
        if value is None:
            return []

        if hasattr(value, "tolist"):
            converted = value.tolist()
            if converted is not value:
                return TemplateFillingDatasetConfig._normalize_slot_values(converted)

        if isinstance(value, str):
            cleaned = value.strip()
            if not cleaned or cleaned.lower() == "none":
                return []
            return [cleaned]

        if isinstance(value, (list, tuple, set)):
            normalized: list[str] = []
            for item in value:
                normalized.extend(
                    TemplateFillingDatasetConfig._normalize_slot_values(item)
                )
            return normalized

        cleaned = str(value).strip()
        if not cleaned or cleaned.lower() == "none":
            return []
        return [cleaned]

    def _build_reference_from_row(self, row: dict[str, Any]) -> dict[str, list[str]]:
        return {
            slot: self._normalize_slot_values(row[column])
            for slot, column in self.slot_columns.items()
        }

    def get_prompt_column_mapping(self) -> dict[str, str]:
        return {
            "context": self.context_column,
        }

    def get_references(self, df: pd.DataFrame) -> Sequence[MUC4Reference]:
        references: list[MUC4Reference] = []

        for _, row in df.iterrows():
            row_data = {str(key): value for key, value in row.to_dict().items()}
            references.append(
                MUC4Reference.create_from_reference(
                    self._build_reference_from_row(row_data)
                )
            )

        return references

    def log_dataset(self, df: pd.DataFrame) -> dict[str, list[Any]]:
        return {
            "context": df[self.context_column].tolist(),
            "gold_reference": [
                reference.model_dump() for reference in self.get_references(df)
            ],
        }

    @model_validator(mode="after")
    def validate_dataset_columns(self) -> "TemplateFillingDatasetConfig":
        dataset_columns = read_dataset_columns(self.path)

        if self.context_column not in dataset_columns:
            raise ValueError(
                f"context_column '{self.context_column}' not found in dataset {self.path}."
            )

        for slot_name, dataset_column in self.slot_columns.items():
            if not slot_name.strip():
                raise ValueError("slot_columns contains an empty slot name.")
            if dataset_column not in dataset_columns:
                raise ValueError(
                    f"slot_columns['{slot_name}'] references missing dataset column "
                    f"'{dataset_column}' in {self.path}."
                )

        for prompt_name, dataset_column in self.get_prompt_column_mapping().items():
            if dataset_column not in dataset_columns:
                raise ValueError(
                    f"prompt_column_mapping['{prompt_name}'] references missing dataset column "
                    f"'{dataset_column}' in {self.path}."
                )

        return self
