from typing import Callable, List

from pydantic import BaseModel, Field

from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo


class PipelineStep(BaseModel):
    name: str = Field(description="Name of the PipelineStep")
    ordering: int = Field(description="Ordering of the PipelineStep")
    required_data: List[str] = Field(
        description="Required data the PipelineStep needs to access.",
        default_factory=list,
    )
    run: Callable[["PipelineCargo"], "PipelineCargo"]

    def __lt__(self, other: "PipelineStep"):
        return self.ordering < other.ordering

    def __str__(self):
        return (
            f"PipelineStep({self.name}, "
            f"ordering={self.ordering}, "
            f"required_data={self.required_data})"
        )

    def __repr__(self):
        return str(self)
