from pathlib import Path
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from evaluation.artifact_registry import ARTIFACT_REGISTRY
from evaluation.metric_registry import METRIC_REGISTRY
from schemas.config.dataset_schema import DatasetConfig
from schemas.config.model_schema import ModelConfig
from schemas.prediction.schema_resolver import resolve_answer_schema

PROJECT_ROOT = Path(__file__).resolve().parents[3]
PROMPT_TEMPLATE_DIR = PROJECT_ROOT / "src" / "prompts"


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
    answer_schema: str
    # evaluation config
    metrics: list[str] = Field(min_length=1)
    artifacts: list[str] = Field(default_factory=list)

    @field_validator("prompt_template", mode="before")
    @classmethod
    def resolve_prompt_template_path(cls, value: Any) -> Path:
        path = Path(str(value))
        if not path.is_absolute():
            path = PROMPT_TEMPLATE_DIR / path
        return path.resolve()

    @field_validator("prompt_template")
    @classmethod
    def validate_file_exists(cls, value: Path) -> Path:
        if not value.exists():
            raise ValueError(f"File not found: {value}")
        return value

    @field_validator("system_prompt_template", mode="before")
    @classmethod
    def resolve_system_prompt_template_path(cls, value: Any) -> Path | None:
        if value is None:
            return None

        path = Path(str(value))
        if not path.is_absolute():
            path = PROMPT_TEMPLATE_DIR / path
        return path.resolve()

    @field_validator("system_prompt_template")
    @classmethod
    def validate_system_prompt_file_exists(cls, value: Path | None) -> Path | None:
        if value is None:
            return None

        if not value.exists():
            raise ValueError(f"File not found: {value}")

        return value

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
    def validate_answer_schema(self) -> "ExperimentConfig":
        resolve_answer_schema(self.answer_schema)

        return self
