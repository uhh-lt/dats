from typing import TYPE_CHECKING, Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, SkipValidation

from app.core.data.dto.preprocessing_job import PreprocessingJobPayloadRead

if TYPE_CHECKING:
    pass


class PipelineCargo(BaseModel):
    ppj_payload: PreprocessingJobPayloadRead = Field(
        description="Parent PreprocessingJobPayload"
    )
    ppj_id: str = Field(description="UUID of the PreprocessingJob")

    next_steps: List[
        SkipValidation
    ] = Field(  # FIXME: "Hack" to ignore the cyclic dependency problem with "PipelineStep"
        description="Next Tasks to be executed.", default_factory=list
    )
    finished_steps: List[
        SkipValidation
    ] = Field(  # FIXME: "Hack" to ignore the cyclic dependency problem with "PipelineStep"
        description="Tasks that have been executed.", default_factory=list
    )

    data: Optional[Dict[str, Any]] = Field(description="data", default_factory=dict)
    model_config = ConfigDict(arbitrary_types_allowed=True)
