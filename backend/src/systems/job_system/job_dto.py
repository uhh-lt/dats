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


class Job:
    def __init__(self, job: rq.job.Job | None = None):
        if job is None:
            job = rq.get_current_job()
        assert job is not None, "Job must be running in a worker context"
        self.job = job

    def update(
        self,
        status_message: str | None = None,
        current_step: int | None = None,
        steps: list[str] | None = None,
        finished: datetime | None = None,
    ):
        if steps is not None:
            self.job.meta["steps"] = steps
        if status_message is not None:
            self.job.meta["status_message"] = status_message
        if current_step is not None:
            self.job.meta["current_step"] = current_step
        if finished is not None:
            self.job.meta["finished"] = finished
        self.job.save_meta()

    def get_id(self) -> str:
        return self.job.id

    def get_project_id(self) -> int:
        return self.job.meta["project_id"]

    def get_steps(self) -> list[str]:
        return self.job.meta["steps"]

    def get_current_step(self) -> int:
        return self.job.meta["current_step"]

    def get_created(self) -> datetime:
        return self.job.meta["created"]

    def get_status(self) -> JobStatus:
        return JobStatus(self.job.get_status())


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

    @classmethod
    def from_rq_job(cls, job: Job):
        return cls(
            job_id=job.job.id,
            job_type=job.job.meta.get("type", "unknown"),
            project_id=job.job.meta.get("project_id", 0),
            status=job.get_status(),
            status_message=job.job.meta.get("status_message", ""),
            current_step=job.job.meta.get("current_step", 0),
            steps=job.job.meta.get("steps", ["Initial step"]),
            input=job.job.kwargs["payload"],
            output=job.job.return_value(),
            created=job.job.meta.get("created", datetime.now()),
            finished=job.job.meta.get("finished", None),
        )
