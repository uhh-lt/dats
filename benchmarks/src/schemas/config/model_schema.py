from pydantic import BaseModel, Field


class ModelConfig(BaseModel):
    name: str = Field(min_length=1)
    alias: str = Field(min_length=1)
    max_len: int = Field(gt=0)
    gpu_memory_utilization: float = Field(ge=0.0, le=1.0)
