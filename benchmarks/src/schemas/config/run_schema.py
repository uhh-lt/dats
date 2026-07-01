from pathlib import Path

from pydantic import BaseModel, field_validator

from schemas.config.backend_schema import VllmBackendConfig
from schemas.config.experiment_schema import ExperimentConfig

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class RunConfig(BaseModel):
    output_dir: Path
    mlflow_uri: str
    fail_on_parse_error: bool = False
    experiment: ExperimentConfig
    backend: VllmBackendConfig

    @field_validator("output_dir")
    @classmethod
    def validate_output_dir(cls, value: Path) -> Path:
        path = Path(value)
        if not path.is_absolute():
            path = PROJECT_ROOT / path
        path.mkdir(parents=True, exist_ok=True)
        return path.resolve()

    @field_validator("mlflow_uri")
    @classmethod
    def validate_mlflow_running(cls, value: str) -> str:
        try:
            import requests

            health_url = f"{value.rstrip('/')}/health"
            response = requests.get(health_url, timeout=5)
            if response.status_code != 200:
                raise ValueError(
                    f"MLflow tracking server at '{value}' is not healthy. /health endpoint returned status code {response.status_code}."
                )
        except Exception as exc:
            raise ValueError(
                f"Could not connect to MLflow tracking server at '{value}': {exc}"
            )
        return value
