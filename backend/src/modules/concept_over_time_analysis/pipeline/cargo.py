from typing import Any, Dict, List

from modules.concept_over_time_analysis.cota_dto import (
    COTARefinementJobRead,
)
from pydantic import BaseModel, ConfigDict, Field, SkipValidation

# if TYPE_CHECKING:
#     from modules.concept_over_time_analysis.pipeline.step import PipelineStep


class Cargo(BaseModel):
    job: COTARefinementJobRead = Field(description="The COTARefinementJob")

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

    def __str__(self) -> str:
        return f"Cargo(job={self.job}, next_steps={self.next_steps}, finished_steps={self.finished_steps})"

    def __repr__(self) -> str:
        return str(self)
