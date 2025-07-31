import enum
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


class JobInputBase(BaseModel):
    project_id: int = Field(..., description="Project ID associated with the job")


InputT = TypeVar("InputT", bound=JobInputBase)
OutputT = TypeVar("OutputT", bound=BaseModel)


class JobRead(BaseModel, Generic[InputT, OutputT]):
    job_id: str = Field(..., description="RQ job ID")
    job_type: str = Field(..., description="Type of the job")
    project_id: int = Field(..., description="Project ID associated with the job")
    status: JobStatus = Field(..., description="Current status of the job")
    status_message: str | None = Field(None, description="Status message")
    input: InputT = Field(..., description="Input for the job")
    output: OutputT | None = Field(None, description="Output for the job")

    @staticmethod
    def from_rq_job(job: rq.job.Job) -> "JobRead[InputT, OutputT]":
        return JobRead(
            job_id=job.id,
            job_type=job.meta.get("type", "unknown"),
            project_id=job.meta.get("project_id", 0),
            status=JobStatus(job.get_status()),
            status_message=job.meta.get("status_message", ""),
            input=job.kwargs["payload"],
            output=job.return_value(),
        )
