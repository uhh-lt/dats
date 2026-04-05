from typing import Any, Literal, Sequence

import pandas as pd
from pydantic import Field, model_validator

from schemas.dataset.dataset_schema import DatasetConfigBase, read_dataset_columns
from schemas.reference.reference_schema import MultiLabelReference, SingleLabelReference


class DocumentClassificationSingleLabelConfig(DatasetConfigBase):
    """Document classification dataset.

    Makes the `text` prompt variable available, mapped from `text_column`.
    """

    dataset_type: Literal["document_classification_single_label"]
    text_column: str = Field(min_length=1)
    label_column: str = Field(min_length=1)

    def get_prompt_column_mapping(self) -> dict[str, str]:
        return {
            "text": self.text_column,
        }

    def get_references(self, df: pd.DataFrame) -> Sequence[SingleLabelReference]:
        references: list[SingleLabelReference] = []

        for raw_value in df[self.label_column].tolist():
            value = raw_value.tolist() if hasattr(raw_value, "tolist") else raw_value
            references.append(SingleLabelReference(label=str(value).strip()))

        return references

    def log_dataset(self, df: pd.DataFrame) -> dict[str, list[Any]]:
        return {
            "text": df[self.text_column].tolist(),
            "gold_label": df[self.label_column].tolist(),
        }

    @model_validator(mode="after")
    def validate_dataset_columns(self) -> "DocumentClassificationSingleLabelConfig":
        dataset_columns = read_dataset_columns(self.path)

        if self.text_column not in dataset_columns:
            raise ValueError(
                f"text_column '{self.text_column}' not found in dataset {self.path}."
            )
        if self.label_column not in dataset_columns:
            raise ValueError(
                f"label_column '{self.label_column}' not found in dataset {self.path}."
            )
        for prompt_name, dataset_column in self.get_prompt_column_mapping().items():
            if dataset_column not in dataset_columns:
                raise ValueError(
                    f"prompt_column_mapping['{prompt_name}'] references missing dataset column "
                    f"'{dataset_column}' in {self.path}."
                )
        return self


class DocumentClassificationMultiLabelConfig(DatasetConfigBase):
    """Multi-label document classification dataset.

    Makes the `text` prompt variable available, mapped from `text_column`.
    """

    dataset_type: Literal["document_classification_multi_label"]
    text_column: str = Field(min_length=1)
    label_column: str = Field(min_length=1)

    def get_prompt_column_mapping(self) -> dict[str, str]:
        return {
            "text": self.text_column,
        }

    def get_references(self, df: pd.DataFrame) -> Sequence[MultiLabelReference]:
        references: list[MultiLabelReference] = []

        for raw_value in df[self.label_column].tolist():
            value = raw_value.tolist() if hasattr(raw_value, "tolist") else raw_value

            if isinstance(value, str):
                labels = [item.strip() for item in value.split(",") if item.strip()]
            elif isinstance(value, (list, tuple, set)):
                labels = [str(item).strip() for item in value if str(item).strip()]
            else:
                labels = [str(value).strip()] if str(value).strip() else []

            references.append(MultiLabelReference(labels=labels))

        return references

    def log_dataset(self, df: pd.DataFrame) -> dict[str, list[Any]]:
        return {
            "text": df[self.text_column].tolist(),
            "gold_label": df[self.label_column].tolist(),
        }

    @model_validator(mode="after")
    def validate_dataset_columns(self) -> "DocumentClassificationMultiLabelConfig":
        dataset_columns = read_dataset_columns(self.path)

        if self.text_column not in dataset_columns:
            raise ValueError(
                f"text_column '{self.text_column}' not found in dataset {self.path}."
            )
        if self.label_column not in dataset_columns:
            raise ValueError(
                f"label_column '{self.label_column}' not found in dataset {self.path}."
            )
        for prompt_name, dataset_column in self.get_prompt_column_mapping().items():
            if dataset_column not in dataset_columns:
                raise ValueError(
                    f"prompt_column_mapping['{prompt_name}'] references missing dataset column "
                    f"'{dataset_column}' in {self.path}."
                )
        return self
