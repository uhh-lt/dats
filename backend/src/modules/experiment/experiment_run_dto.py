from datetime import datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field

from core.prompt.prompt_dto import PromptVersionRead
from core.prompt.prompt_enum import TaskType
from modules.agreement.agreement_dto import AgreementCodeScore, AgreementScore
from modules.agreement.agreement_enum import AgreementScoring
from repos.db.dto_base import UpdateDTOBase
from systems.job_system.job_dto import JobInputBase
from systems.job_system.job_system_enum import JobStatus


class ExperimentRunScores(BaseModel):
    """The agreement between the gold annotator and a run with one scoring."""

    scoring: AgreementScoring = Field(
        description="How the annotations were split into scoring units"
    )
    num_units: int = Field(
        description="Number of units that carry a code on at least one side"
    )
    total: AgreementScore = Field(
        description="Scores over all codes (micro average: the counts are summed)"
    )
    code_scores: list[AgreementCodeScore] = Field(
        description="Scores per code, in the order of the experiment's codes"
    )


# Properties shared across all DTOs
class ExperimentRunBaseDTO(BaseModel):
    experiment_id: int = Field(description="ID of the experiment of the run")
    name: str = Field(
        description=(
            "Name of the run, unique per experiment; the run writes into the "
            "virtual user <experiment name>-<run name>"
        ),
        min_length=1,
    )
    prompt_version_id: int = Field(
        description=(
            "ID of the prompt version of the run: a version of the experiment's task "
            "whose codes equal the experiment's codes"
        )
    )
    model: str = Field(description="Large Language Model to run the prompt with")


# Properties for creation
class ExperimentRunCreate(ExperimentRunBaseDTO):
    pass


class ExperimentRunCreateIntern(ExperimentRunCreate):
    sdoc_ids: list[int] = Field(description="IDs of the documents the run runs on")
    virtual_user_id: int = Field(
        description="ID of the virtual user the run writes its annotations into"
    )
    user_id: int = Field(description="ID of the user who started the run")
    status: JobStatus = Field(description="State of the run")


# Properties for updating
class ExperimentRunUpdateIntern(BaseModel, UpdateDTOBase):
    status: JobStatus | None = Field(description="State of the run", default=None)
    job_id: str | None = Field(description="ID of the job of the run", default=None)
    started: datetime | None = Field(
        description="When the job of the run started", default=None
    )
    finished: datetime | None = Field(
        description="When the job of the run ended", default=None
    )
    scores: list[ExperimentRunScores] | None = Field(
        description="The stored agreement with the gold annotator", default=None
    )
    scores_computed: datetime | None = Field(
        description="When the stored agreement was computed", default=None
    )

    non_nullable_fields: ClassVar[frozenset[str]] = frozenset({"status", "scores"})


# Properties for reading (as in ORM)
class ExperimentRunRead(ExperimentRunBaseDTO):
    id: int = Field(description="ID of the run")
    sdoc_ids: list[int] = Field(description="IDs of the documents the run ran on")
    virtual_user_id: int = Field(
        description="ID of the virtual user the run writes its annotations into"
    )
    user_id: int | None = Field(description="ID of the user who started the run")
    status: JobStatus = Field(description="State of the run")
    job_id: str | None = Field(description="ID of the job of the run")
    started: datetime | None = Field(description="When the job of the run started")
    finished: datetime | None = Field(description="When the job of the run ended")
    scores: list[ExperimentRunScores] = Field(
        description=(
            "The stored agreement with the gold annotator, one entry per scoring; "
            "empty until the run finished"
        )
    )
    scores_computed: datetime | None = Field(
        description="When the stored agreement was computed"
    )
    created: datetime = Field(description="Created timestamp of the run")
    updated: datetime = Field(description="Updated timestamp of the run")
    model_config = ConfigDict(from_attributes=True)


class ExperimentRunJobInput(JobInputBase):
    run_id: int = Field(description="ID of the run to execute")


class ExperimentRunLog(BaseModel):
    """A self-contained, machine-readable log of a run."""

    experiment_id: int = Field(description="ID of the experiment")
    experiment_name: str = Field(description="Name of the experiment")
    task_type: TaskType = Field(description="Task of the experiment")
    code_ids: list[int] = Field(description="IDs of the codes of the experiment")
    gold_user_id: int | None = Field(
        description="ID of the gold annotator, null if it was deleted"
    )
    gold_user_name: str | None = Field(
        description="Name of the gold annotator, null if it was deleted"
    )
    run_id: int = Field(description="ID of the run")
    run_name: str = Field(description="Name of the run")
    virtual_user_id: int = Field(description="ID of the virtual user of the run")
    virtual_user_name: str = Field(description="Name of the virtual user of the run")
    prompt_id: int = Field(description="ID of the prompt of the run")
    prompt_name: str = Field(description="Name of the prompt of the run")
    prompt_version: PromptVersionRead = Field(
        description=(
            "The prompt version of the run with its full content: text, codes, "
            "tags, metadata fields, examples and settings"
        )
    )
    model: str = Field(description="Large Language Model of the run")
    sdoc_ids: list[int] = Field(description="IDs of the documents the run ran on")
    user_id: int | None = Field(description="ID of the user who started the run")
    user_name: str | None = Field(description="Name of the user who started the run")
    status: JobStatus = Field(description="State of the run")
    job_id: str | None = Field(description="ID of the job of the run")
    created: datetime = Field(description="When the run was created")
    started: datetime | None = Field(description="When the job of the run started")
    finished: datetime | None = Field(description="When the job of the run ended")
    scores: list[ExperimentRunScores] = Field(
        description="The stored agreement with the gold annotator"
    )
    scores_computed: datetime | None = Field(
        description="When the stored agreement was computed"
    )
