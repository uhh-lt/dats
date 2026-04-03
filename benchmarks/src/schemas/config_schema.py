import os
from importlib import import_module
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from pydantic import BaseModel, Field, field_validator, model_validator

from evaluation.artifact_registry import ARTIFACT_REGISTRY
from evaluation.metric_registry import METRIC_REGISTRY

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


class DatasetConfig(BaseModel):
    name: str = Field(min_length=1)
    path: Path
    text_column: str = Field(min_length=1)
    label_column: str = Field(min_length=1)

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

    @model_validator(mode="after")
    def validate_dataset_columns(self) -> "DatasetConfig":
        if self.path.suffix == ".csv":
            dataset_columns = set(pd.read_csv(self.path, nrows=0).columns)
        elif self.path.suffix == ".parquet":
            dataset_columns = set(pd.read_parquet(self.path).columns)
        else:
            raise ValueError(f"Unsupported dataset format: {self.path.suffix}")

        if self.text_column not in dataset_columns:
            raise ValueError(
                f"text_column '{self.text_column}' not found in dataset {self.path}."
            )
        if self.label_column not in dataset_columns:
            raise ValueError(
                f"label_column '{self.label_column}' not found in dataset {self.path}."
            )
        return self


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
    prompt_variables: Dict[str, Any]
    system_prompt_template: Path | None = None
    system_prompt_variables: Dict[str, Any] = Field(default_factory=dict)
    # output config
    schema_ref: str = Field(alias="schema")
    prediction_label_field: str
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

        if self.prediction_label_field not in schema_class.model_fields:
            raise ValueError(
                f"prediction_label_field '{self.prediction_label_field}' not found in schema '{v}'."
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
