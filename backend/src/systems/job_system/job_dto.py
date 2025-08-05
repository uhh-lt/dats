import enum
from datetime import datetime
from typing import Generic, TypeVar

import rq
from pydantic import BaseModel, Field


# See https://python-rq.org/docs/jobs/
class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    FINISHED = "finished"
    FAILED = "failed"
    STARTED = "started"
    DEFERRED = "deferred"
    SCHEDULED = "scheduled"
    STOPPED = "stopped"
    CANCELED = "canceled"


RUNNING_JOB_STATUS = [
    JobStatus.QUEUED,
    JobStatus.STARTED,
    JobStatus.SCHEDULED,
]


class JobPriority(str, enum.Enum):
    LOW = "low"
    DEFAULT = "default"
    HIGH = "high"


class EndpointGeneration(str, enum.Enum):
    ALL = "all"  # Generate all endpoints
    MINIMAL = "minimal"  # Generate start and get_by_id endpoints
    NONE = "none"  # Do not generate any endpoints


class JobInputBase(BaseModel):
    project_id: int = Field(description="Project ID associated with the job")


InputT = TypeVar("InputT", bound=JobInputBase)
OutputT = TypeVar("OutputT", bound=BaseModel | None)


class JobRead(BaseModel, Generic[InputT, OutputT]):
    job_id: str = Field(description="RQ job ID")
    job_type: str = Field(description="Type of the job")
    project_id: int = Field(description="Project ID associated with the job")
    status: JobStatus = Field(description="Current status of the job")
    status_message: str | None = Field(None, description="Status message")
    current_step: int = Field(description="Current step in the job process")
    steps: list[str] = Field(description="Total number of steps in the job process")
    input: InputT = Field(description="Input for the job")
    output: OutputT | None = Field(None, description="Output for the job")
    created: datetime = Field(description="Created timestamp of the job")
    finished: datetime | None = Field(None, description="Finished timestamp of the job")

    @staticmethod
    def from_rq_job(job: rq.job.Job) -> "JobRead[InputT, OutputT]":
        return JobRead(
            job_id=job.id,
            job_type=job.meta.get("type", "unknown"),
            project_id=job.meta.get("project_id", 0),
            status=JobStatus(job.get_status()),
            status_message=job.meta.get("status_message", ""),
            current_step=job.meta.get("current_step", 0),
            steps=job.meta.get("steps", ["Initial step"]),
            input=job.kwargs["payload"],
            output=job.return_value(),
            created=job.meta.get("created", datetime.now()),
            finished=job.meta.get("finished", None),
        )
