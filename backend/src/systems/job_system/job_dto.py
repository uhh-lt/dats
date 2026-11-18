from collections.abc import Mapping
from datetime import UTC, datetime
from typing import Generic, TypeVar

import rq
from pydantic import BaseModel, Field
from redis.typing import EncodableT
from rq.utils import as_text

from systems.job_system.job_system_enum import JobStatus, JobTiming

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

    @property
    def _checkpoint_key(self) -> str:
        return f"{self.job.key}:checkpoint"

    def save_checkpoint(self, entries: Mapping[str, str]) -> None:
        """Add entries to the job's checkpoint: what the job finished so far, by
        a key of the job's choice, so a retry of the job can skip it. Saving costs
        what the entries cost, whatever the checkpoint holds. The checkpoint lives
        in Redis next to the job and never outlives it: while the job runs, it
        expires a day after the job's timeout (never if the job has none); once
        the job ended, the job handler sets its TTL (`end_checkpoint`)."""
        if not entries:
            return
        with self.job.connection.pipeline() as pipe:
            mapping: dict[EncodableT, EncodableT] = {k: v for k, v in entries.items()}
            pipe.hset(self._checkpoint_key, mapping=mapping)
            # a running job ends within its timeout, and its end sets the TTL
            # of its checkpoint, unless its worker died: then the cleanup of the
            # started jobs ends it, but no later than a day after its timeout
            timeout = int(self.job.timeout or rq.Queue.DEFAULT_TIMEOUT)
            if timeout < 0:
                pipe.persist(self._checkpoint_key)
            else:
                pipe.expire(self._checkpoint_key, timeout + JobTiming.ONE_DAY)
            pipe.execute()

    def read_checkpoint(self) -> dict[str, str]:
        """The entries of the job's checkpoint, empty unless an earlier attempt
        of the job saved some."""
        entries = self.job.connection.hgetall(self._checkpoint_key)
        return {as_text(key): as_text(value) for key, value in entries.items()}

    def end_checkpoint(self, ttl: int) -> None:
        """Let the checkpoint of the ended job expire in `ttl` seconds (never if
        negative): a failed or stopped job keeps it for a retry as long as RQ
        keeps the job, a finished job until RQ surely saved its result."""
        if ttl < 0:
            self.job.connection.persist(self._checkpoint_key)
            return
        self.job.connection.expire(self._checkpoint_key, ttl)

    def get_type(self) -> str:
        return self.job.meta["type"]

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
