import os
from importlib import import_module
from pathlib import Path
from typing import Annotated, Any, Dict, List, Literal, Optional, TypeAlias

import pandas as pd
from pydantic import BaseModel, Field, field_validator, model_validator

from evaluation.artifact_registry import ARTIFACT_REGISTRY
from evaluation.metric_registry import METRIC_REGISTRY
from schemas.answer_schema import BaseAnswerSchema

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PROMPT_TEMPLATE_DIR = PROJECT_ROOT / "src" / "prompts"
DATASET_DIR = PROJECT_ROOT / "datasets"


class VllmBackendConfig(BaseModel):
    image: str
    host_port: int = Field(gt=0)
    startup_timeout_seconds: int = Field(gt=0)
    gpu_id: int = Field(ge=0)
    hf_token_env_var: str
    hf_cache_dir: str
    concurrency: int = Field(ge=1)
    api_key: str

    @model_validator(mode="after")
    def check_env_vars(self) -> "VllmBackendConfig":
        if not os.getenv(self.hf_token_env_var):
            raise ValueError(
                f"Required environment variable '{self.hf_token_env_var}' is not set."
            )
        return self


class ModelConfig(BaseModel):
    name: str = Field(min_length=1)
    alias: str = Field(min_length=1)
    max_len: int = Field(gt=0)
    gpu_memory_utilization: float = Field(ge=0.0, le=1.0)


def _read_dataset_columns(path: Path) -> set[str]:
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
    def resolve_dataset_path(cls, v: Any) -> Path:
        path = Path(str(v))
        if not path.is_absolute():
            path = DATASET_DIR / path
        return path.resolve()

    @field_validator("path")
    @classmethod
    def validate_dataset_file_exists(cls, v: Path) -> Path:
        if not v.exists():
            raise ValueError(f"File not found: {v}")
        return v

    def get_prompt_column_mapping(self) -> Dict[str, str]:
        raise NotImplementedError

    def get_true_labels(self, df: pd.DataFrame) -> list[Any]:
        raise NotImplementedError

    def log_dataset(self, df: pd.DataFrame) -> Dict[str, list[Any]]:
        raise NotImplementedError

    def build_prompt_row_context(self, row: dict[str, Any]) -> dict[str, Any]:
        prompt_column_mapping = self.get_prompt_column_mapping()
        context: dict[str, Any] = {}
        for prompt_name, dataset_column in prompt_column_mapping.items():
            if dataset_column not in row:
                raise ValueError(
                    f"Dataset column '{dataset_column}' configured for prompt variable '{prompt_name}' "
                    f"is missing in row data."
                )
            value = row[dataset_column]
            context[prompt_name] = value.item() if hasattr(value, "item") else value
        return context


class DocumentClassificationConfig(DatasetConfigBase):
    """Document classification dataset.

    Makes the `text` prompt variable available, mapped from `text_column`.
    """

    dataset_type: Literal["document_classification"]
    text_column: str = Field(min_length=1)
    label_column: str = Field(min_length=1)

    def get_prompt_column_mapping(self) -> Dict[str, str]:
        return {
            "text": self.text_column,
        }

    def get_true_labels(self, df: pd.DataFrame) -> list[Any]:
        return df[self.label_column].astype(str).tolist()

    def log_dataset(self, df: pd.DataFrame) -> Dict[str, list[Any]]:
        return {
            "text": df[self.text_column].tolist(),
            "gold_label": df[self.label_column].tolist(),
        }

    @model_validator(mode="after")
    def validate_dataset_columns(self) -> "DocumentClassificationConfig":
        dataset_columns = _read_dataset_columns(self.path)

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


class QADatasetConfig(DatasetConfigBase):
    """Extractive QA dataset.

    Makes `context` and `question` prompt variables available, mapped from
    `context_column` and `question_column`.
    """

    dataset_type: Literal["extractive_qa"]
    context_column: str = Field(min_length=1)
    question_column: str = Field(min_length=1)
    references_column: str = Field(min_length=1)

    def get_prompt_column_mapping(self) -> Dict[str, str]:
        return {
            "context": self.context_column,
            "question": self.question_column,
        }

    def get_true_labels(self, df: pd.DataFrame) -> list[Any]:
        return df[self.references_column].tolist()

    def log_dataset(self, df: pd.DataFrame) -> Dict[str, list[Any]]:
        return {
            "context": df[self.context_column].tolist(),
            "question": df[self.question_column].tolist(),
            "gold_reference": df[self.references_column].tolist(),
        }

    @model_validator(mode="after")
    def validate_dataset_columns(self) -> "QADatasetConfig":
        dataset_columns = _read_dataset_columns(self.path)

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


DatasetConfig: TypeAlias = Annotated[
    DocumentClassificationConfig | QADatasetConfig,
    Field(discriminator="dataset_type"),
]


class ExperimentConfig(BaseModel):
    experiment_name: str = Field(pattern=r"^[a-zA-Z0-9_\-]+$")
    run_name: Optional[str] = Field(default=None, pattern=r"^[a-zA-Z0-9_\-]+$")
    # model config
    model: ModelConfig
    temperature: float = Field(ge=0.0)
    # dataset config
    dataset: DatasetConfig
    max_examples: Optional[int] = Field(gt=0, default=None)
    sample_randomly: bool = False
    sample_random_state: int = 42
    # input config
    prompt_template: Path
    prompt_variables: Dict[str, Any] = Field(default_factory=dict)
    system_prompt_template: Path | None = None
    system_prompt_variables: Dict[str, Any] = Field(default_factory=dict)
    # output config
    schema_ref: str = Field(alias="schema")
    # evaluation config
    metrics: List[str] = Field(min_length=1)
    artifacts: List[str] = Field(default_factory=list)

    @field_validator("prompt_template", mode="before")
    @classmethod
    def resolve_prompt_template_path(cls, v: Any) -> Path:
        path = Path(str(v))
        if not path.is_absolute():
            path = PROMPT_TEMPLATE_DIR / path
        return path.resolve()

    @field_validator("prompt_template")
    @classmethod
    def validate_file_exists(cls, v: Path) -> Path:
        if not v.exists():
            raise ValueError(f"File not found: {v}")
        return v

    @field_validator("system_prompt_template", mode="before")
    @classmethod
    def resolve_system_prompt_template_path(cls, v: Any) -> Path | None:
        if v is None:
            return None

        path = Path(str(v))
        if not path.is_absolute():
            path = PROMPT_TEMPLATE_DIR / path
        return path.resolve()

    @field_validator("system_prompt_template")
    @classmethod
    def validate_system_prompt_file_exists(cls, v: Path | None) -> Path | None:
        if v is None:
            return None

        if not v.exists():
            raise ValueError(f"File not found: {v}")

        return v

    @field_validator("metrics")
    @classmethod
    def validate_metrics(cls, values: List[str]) -> List[str]:
        for metric in values:
            if not isinstance(metric, str) or not metric.strip():
                raise ValueError("All entries in 'metrics' must be non-empty strings.")
            if metric not in METRIC_REGISTRY:
                raise ValueError(
                    f"Unsupported metric '{metric}'. Supported metrics: {list(METRIC_REGISTRY.keys())}"
                )
        return values

    @field_validator("artifacts")
    @classmethod
    def validate_artifacts(cls, values: List[str]) -> List[str]:
        for artifact in values:
            if not isinstance(artifact, str) or not artifact.strip():
                raise ValueError(
                    "All entries in 'artifacts' must be non-empty strings."
                )
            if artifact not in ARTIFACT_REGISTRY:
                raise ValueError(
                    f"Unsupported artifact '{artifact}'. Supported artifacts: {list(ARTIFACT_REGISTRY.keys())}"
                )
        return values

    @model_validator(mode="after")
    def validate_output_schema(self) -> "ExperimentConfig":
        v = self.schema_ref
        if "." not in v:
            raise ValueError(f"Key 'schema' must be '<module>.<ClassName>', got '{v}'.")

        schema_module_name, schema_class_name = v.rsplit(".", 1)
        import_name = (
            schema_module_name
            if schema_module_name.startswith("schemas.")
            else f"schemas.{schema_module_name}"
        )

        module = import_module(import_name)
        schema_class = getattr(module, schema_class_name)
        if not issubclass(schema_class, BaseModel):
            raise TypeError(f"schema '{v}' must resolve to a pydantic BaseModel class.")

        if not issubclass(schema_class, BaseAnswerSchema):
            raise TypeError(
                f"schema '{v}' must inherit from BaseAnswerSchema and implement get_prediction()."
            )

        return self


class RunConfig(BaseModel):
    output_dir: Path
    mlflow_uri: str
    fail_on_parse_error: bool = False
    experiment: ExperimentConfig
    backend: VllmBackendConfig

    @field_validator("output_dir")
    @classmethod
    def validate_output_dir(cls, v: Path) -> Path:
        path = Path(v)
        if not path.is_absolute():
            path = PROJECT_ROOT / path
        path.mkdir(parents=True, exist_ok=True)
        return path.resolve()

    @field_validator("mlflow_uri")
    @classmethod
    def validate_mlflow_running(cls, v: str) -> str:
        try:
            import requests

            health_url = f"{v.rstrip('/')}/health"
            response = requests.get(health_url, timeout=5)
            if response.status_code != 200:
                raise ValueError(
                    f"MLflow tracking server at '{v}' is not healthy. /health endpoint returned status code {response.status_code}."
                )
        except Exception as exc:
            raise ValueError(
                f"Could not connect to MLflow tracking server at '{v}': {exc}"
            )
        return v
