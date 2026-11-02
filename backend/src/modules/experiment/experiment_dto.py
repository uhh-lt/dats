from datetime import datetime
from typing import ClassVar, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from core.prompt.prompt_enum import TaskType
from core.user.user_dto import UserRead
from modules.experiment.experiment_run_dto import ExperimentRunRead
from modules.llm_assistant.llm_assistant_job_dto import ANNOTATING_TASK_TYPES
from repos.db.dto_base import UpdateDTOBase


# Properties shared across all DTOs
class ExperimentBaseDTO(BaseModel):
    name: str = Field(description="Name of the experiment", min_length=1)
    task_type: TaskType = Field(
        description="Task of the experiment: span or sentence annotation"
    )
    sdoc_ids: list[int] = Field(
        description="IDs of the documents of the experiment", min_length=1
    )
    code_ids: list[int] = Field(
        description="IDs of the codes of the experiment", min_length=1
    )


# Properties for creation
class ExperimentCreate(ExperimentBaseDTO):
    project_id: int = Field(description="Project the experiment belongs to")
    gold_user_id: int = Field(
        description=(
            "ID of the gold annotator, who must have annotated every document "
            "(filter 'Annotated by')"
        )
    )

    @model_validator(mode="after")
    def check_task_type(self) -> Self:
        if self.task_type not in ANNOTATING_TASK_TYPES:
            raise ValueError("An experiment is a span or sentence annotation task")
        return self


# Properties for updating: only the name, the documents, codes, task and gold
# annotator of an experiment are fixed when it is created
class ExperimentUpdate(BaseModel, UpdateDTOBase):
    name: str | None = Field(
        description="Name of the experiment", min_length=1, default=None
    )

    non_nullable_fields: ClassVar[frozenset[str]] = frozenset({"name"})
    model_config = ConfigDict(extra="forbid")


# Properties for reading (as in ORM)
class ExperimentRead(ExperimentBaseDTO):
    id: int = Field(description="ID of the experiment")
    project_id: int = Field(description="Project the experiment belongs to")
    gold_user_id: int | None = Field(
        description=(
            "ID of the gold annotator; null if the gold annotator was deleted, then "
            "the experiment keeps its runs and their scores, but cannot start runs or "
            "refresh scores"
        )
    )
    created: datetime = Field(description="Created timestamp of the experiment")
    updated: datetime = Field(description="Updated timestamp of the experiment")
    runs: list[ExperimentRunRead] = Field(
        description="The runs of the experiment, in the order of creation"
    )
    model_config = ConfigDict(from_attributes=True)


class ExperimentUpdated(BaseModel):
    """An updated experiment with the virtual users of its runs, which were renamed
    if the experiment was renamed."""

    experiment: ExperimentRead = Field(description="The updated experiment")
    virtual_users: list[UserRead] = Field(
        description="The renamed virtual users of the runs"
    )


class ExperimentDeleted(BaseModel):
    """A deleted experiment with the deleted virtual users of its runs."""

    experiment: ExperimentRead = Field(description="The deleted experiment")
    virtual_users: list[UserRead] = Field(
        description="The deleted virtual users of the runs"
    )


class ExperimentRunDeleted(BaseModel):
    """A deleted run with its deleted virtual user."""

    experiment: ExperimentRead = Field(description="The experiment without the run")
    run: ExperimentRunRead = Field(description="The deleted run")
    virtual_user: UserRead = Field(description="The deleted virtual user of the run")


class ExperimentRunCreated(BaseModel):
    """A new run with its new virtual user."""

    experiment: ExperimentRead = Field(description="The experiment with the new run")
    run: ExperimentRunRead = Field(description="The new run")
    virtual_user: UserRead = Field(description="The new virtual user of the run")
