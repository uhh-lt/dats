from pathlib import Path
from typing import Any, Sequence

import pandas as pd
from pydantic import BaseModel, Field, field_validator

from schemas.reference.reference_schema import BaseReferenceSchema

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATASET_DIR = PROJECT_ROOT / "datasets"


def read_dataset_columns(path: Path) -> set[str]:
    if path.suffix == ".csv":
        return set(pd.read_csv(path, nrows=0).columns)
    if path.suffix == ".parquet":
        return set(pd.read_parquet(path).columns)
    raise ValueError(f"Unsupported dataset format: {path.suffix}")


class DatasetConfigBase(BaseModel):
    """Base dataset config. Subclasses define which columns are exposed to prompt templates."""

    name: str = Field(min_length=1)
    path: Path

    @field_validator("path", mode="before")
    @classmethod
    def resolve_dataset_path(cls, value: Any) -> Path:
        path = Path(str(value))
        if not path.is_absolute():
            path = DATASET_DIR / path
        return path.resolve()

    @field_validator("path")
    @classmethod
    def validate_dataset_file_exists(cls, value: Path) -> Path:
        if not value.exists():
            raise ValueError(f"File not found: {value}")
        return value

    def get_prompt_column_mapping(self) -> dict[str, str]:
        raise NotImplementedError

    def get_references(self, df: pd.DataFrame) -> Sequence[BaseReferenceSchema]:
        raise NotImplementedError

    def log_dataset(self, df: pd.DataFrame) -> dict[str, list[Any]]:
        raise NotImplementedError

    def build_prompt_row_context(self, row: dict[str, Any]) -> dict[str, Any]:
        prompt_column_mapping = self.get_prompt_column_mapping()
        context: dict[str, Any] = {}
        for prompt_name, dataset_column in prompt_column_mapping.items():
            if dataset_column not in row:
                raise ValueError(
                    f"Dataset column '{dataset_column}' configured for prompt variable '{prompt_name}' "
                    "is missing in row data."
                )
            value = row[dataset_column]
            context[prompt_name] = value.item() if hasattr(value, "item") else value
        return context
