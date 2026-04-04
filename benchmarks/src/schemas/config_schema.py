import os
from importlib import import_module
from pathlib import Path
from typing import Annotated, Any, Literal, Optional, TypeAlias

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

    def get_prompt_column_mapping(self) -> dict[str, str]:
        raise NotImplementedError

    def get_true_labels(self, df: pd.DataFrame) -> list[Any]:
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

    def get_prompt_column_mapping(self) -> dict[str, str]:
        return {
            "text": self.text_column,
        }

    def get_true_labels(self, df: pd.DataFrame) -> list[Any]:
        return df[self.label_column].astype(str).tolist()

    def log_dataset(self, df: pd.DataFrame) -> dict[str, list[Any]]:
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

    def get_prompt_column_mapping(self) -> dict[str, str]:
        return {
            "context": self.context_column,
            "question": self.question_column,
        }

    def get_true_labels(self, df: pd.DataFrame) -> list[Any]:
        return df[self.references_column].tolist()

    def log_dataset(self, df: pd.DataFrame) -> dict[str, list[Any]]:
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
    def normalize_id2label(cls, v: Any) -> dict[int, str]:
        if not isinstance(v, dict):
            raise TypeError("id2label must be a dictionary.")

        normalized: dict[int, str] = {}
        for label_id, label_name in v.items():
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

    def get_true_labels(self, df: pd.DataFrame) -> list[Any]:
        references: list[dict[str, Any]] = []

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
                {
                    "tokens": tokens,
                    "tag_ids": tag_ids,
                    "id2label": self.id2label,
                }
            )

        return references

    def log_dataset(self, df: pd.DataFrame) -> dict[str, list[Any]]:
        references = self.get_true_labels(df)
        return {
            "tokens": [reference["tokens"] for reference in references],
            "gold_tags": [
                [reference["id2label"][label_id] for label_id in reference["tag_ids"]]
                for reference in references
            ],
        }

    @model_validator(mode="after")
    def validate_dataset_columns(self) -> "SpanClassificationConfig":
        dataset_columns = _read_dataset_columns(self.path)

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

    def get_true_labels(self, df: pd.DataFrame) -> list[dict[str, list[str]]]:
        references: list[dict[str, list[str]]] = []

        for _, row in df.iterrows():
            row_data = {str(key): value for key, value in row.to_dict().items()}
            references.append(self._build_reference_from_row(row_data))

        return references

    def log_dataset(self, df: pd.DataFrame) -> dict[str, list[Any]]:
        return {
            "context": df[self.context_column].tolist(),
            "gold_reference": self.get_true_labels(df),
        }

    @model_validator(mode="after")
    def validate_dataset_columns(self) -> "TemplateFillingDatasetConfig":
        dataset_columns = _read_dataset_columns(self.path)

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


DatasetConfig: TypeAlias = Annotated[
    DocumentClassificationConfig
    | QADatasetConfig
    | SpanClassificationConfig
    | TemplateFillingDatasetConfig,
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
    prompt_variables: dict[str, Any] = Field(default_factory=dict)
    system_prompt_template: Path | None = None
    system_prompt_variables: dict[str, Any] = Field(default_factory=dict)
    # output config
    schema_ref: str = Field(alias="schema")
    # evaluation config
    metrics: list[str] = Field(min_length=1)
    artifacts: list[str] = Field(default_factory=list)

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
    def validate_metrics(cls, values: list[str]) -> list[str]:
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
    def validate_artifacts(cls, values: list[str]) -> list[str]:
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
