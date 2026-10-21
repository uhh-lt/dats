from datetime import UTC, datetime
from typing import Generic, TypeVar

import rq
from pydantic import BaseModel, Field

from common.job_type_enum import JobType
from systems.job_system.job_system_enum import JobStatus

RUNNING_JOB_STATUS = [
    JobStatus.QUEUED,
    JobStatus.STARTED,
    JobStatus.SCHEDULED,
]


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
        device: str | None = None,
        publish: bool = True,
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

        if not publish:
            return

        from systems.job_system.job_events import publish_job_update

        publish_job_update(self)

    def get_id(self) -> str:
        return self.job.id

    def get_type(self) -> JobType:
        return JobType(self.job.meta["type"])

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

    def publishes_updates(self) -> bool:
        return bool(self.job.meta.get("publish_updates", False))


class JobInputBase(BaseModel):
    project_id: int = Field(description="Project ID associated with the job")


class JobOutputBase(BaseModel):
    pass


InputT = TypeVar("InputT", bound=JobInputBase)
OutputT = TypeVar("OutputT", bound=JobOutputBase | None)


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
            created=job.job.meta.get("created", datetime.now(UTC)),
            finished=job.job.meta.get("finished", None),
        )
