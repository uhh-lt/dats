from typing import Any, Literal, Sequence

import pandas as pd
from pydantic import Field, model_validator

from schemas.dataset.dataset_schema import DatasetConfigBase, read_dataset_columns
from schemas.reference.reference_schema import ExtractiveQAReference


class QADatasetConfig(DatasetConfigBase):
    """Extractive QA dataset.

    Makes `context` and `question` prompt variables available, mapped from
    `context_column` and `question_column`.
    """

    dataset_type: Literal["extractive_qa"]
    context_column: str = Field(min_length=1)
    question_column: str = Field(min_length=1)
    references_column: str = Field(min_length=1)

    def get_prompt_column_mapping(self) -> dict[str, str]:
        return {
            "context": self.context_column,
            "question": self.question_column,
        }

    def get_references(self, df: pd.DataFrame) -> Sequence[ExtractiveQAReference]:
        return [
            ExtractiveQAReference.create_from_reference(reference)
            for reference in df[self.references_column].tolist()
        ]

    def log_dataset(self, df: pd.DataFrame) -> dict[str, list[Any]]:
        return {
            "context": df[self.context_column].tolist(),
            "question": df[self.question_column].tolist(),
            "gold_reference": df[self.references_column].tolist(),
        }

    @model_validator(mode="after")
    def validate_dataset_columns(self) -> "QADatasetConfig":
        dataset_columns = read_dataset_columns(self.path)

        if self.context_column not in dataset_columns:
            raise ValueError(
                f"context_column '{self.context_column}' not found in dataset {self.path}."
            )
        if self.question_column not in dataset_columns:
            raise ValueError(
                f"question_column '{self.question_column}' not found in dataset {self.path}."
            )
        if self.references_column not in dataset_columns:
            raise ValueError(
                f"references_column '{self.references_column}' not found in dataset {self.path}."
            )
        for prompt_name, dataset_column in self.get_prompt_column_mapping().items():
            if dataset_column not in dataset_columns:
                raise ValueError(
                    f"prompt_column_mapping['{prompt_name}'] references missing dataset column "
                    f"'{dataset_column}' in {self.path}."
                )
        return self
