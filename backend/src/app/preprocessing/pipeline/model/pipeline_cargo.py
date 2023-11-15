from typing import TYPE_CHECKING, Any, Dict, List

from pydantic import BaseModel, Field

from app.core.data.dto.preprocessing_job import PreprocessingJobPayloadRead

if TYPE_CHECKING:
    from app.preprocessing.pipeline.model.pipeline_step import PipelineStep


class PipelineCargo(BaseModel):
    ppj_payload: PreprocessingJobPayloadRead = Field(
        description="Parent PreprocessingJobPayload"
    )
    next_steps: List["PipelineStep"] = Field(
        description="Next Tasks to be executed.", default_factory=list
    )
    finished_steps: List["PipelineStep"] = Field(
        description="Tasks that have been executed.", default_factory=list
    )

    data: Dict[str, Any] = Field(description="data", default_factory=dict)

    class Config:
        arbitrary_types_allowed = True
