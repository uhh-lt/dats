from typing import TYPE_CHECKING, Any, Dict, List

from loguru import logger
from pydantic import BaseModel, ConfigDict, Field, SkipValidation

from preprocessing.preprocessing_job_dto import PreprocessingJobPayloadRead

if TYPE_CHECKING:
    pass


class PipelineCargo(BaseModel):
    ppj_payload: PreprocessingJobPayloadRead = Field(
        description="Parent PreprocessingJobPayload"
    )
    ppj_id: str = Field(description="UUID of the PreprocessingJob")

    next_steps: List[SkipValidation] = (
        Field(  # FIXME: "Hack" to ignore the cyclic dependency problem with "PipelineStep"
            description="Next Tasks to be executed.", default_factory=list
        )
    )
    finished_steps: List[SkipValidation] = (
        Field(  # FIXME: "Hack" to ignore the cyclic dependency problem with "PipelineStep"
            description="Tasks that have been executed.", default_factory=list
        )
    )

    data: Dict[str, Any] = Field(description="data", default_factory=dict)
    model_config = ConfigDict(arbitrary_types_allowed=True)

    def _flush_next_steps(self) -> None:
        # Gracefully finish the cargo by flushing all next steps to finished steps. This way, the PreProService
        #  will skip the steps... If you change this or the mechanism in the PPS, be aware ...
        try:
            fn = self.data["pptd"].filepath.name
        except Exception:
            fn = None

        logger.info(
            f"Gracefully finishing preprocessing {'for ' + fn if fn else ''} cargo..."
        )
        logger.debug(
            f"Preemptively flushing all {len(self.next_steps)} next steps{'for ' + fn if fn else ''} to finished steps...."
        )
        while len(self.next_steps) > 0:
            step = self.next_steps.pop(0)
            self.finished_steps.append(step)
