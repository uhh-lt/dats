import os

from pydantic import BaseModel, Field, model_validator


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
