import inspect
from datetime import UTC, datetime
from typing import Any, Callable, Dict, Literal, NamedTuple, TypedDict, TypeVar

import rq
from fastapi import APIRouter
from loguru import logger
from pydantic import Field, create_model
from redis import Redis
from redis.exceptions import RedisError
from rq.registry import (
    BaseRegistry,
    CanceledJobRegistry,
    DeferredJobRegistry,
    FailedJobRegistry,
    FinishedJobRegistry,
    StartedJobRegistry,
)
from sqlalchemy.orm import Session

from common.job_type_enum import JobType
from common.singleton_meta import SingletonMeta
from repos.redis_repo import RedisRepo
from systems.job_system.job_dto import Job, JobInputBase, JobOutputBase, JobRead
from systems.job_system.job_exceptions import JobInputError, JobQueueUnavailableError
from systems.job_system.job_system_enum import EndpointGeneration, JobPriority

InputT = TypeVar("InputT", bound=JobInputBase)
OutputT = TypeVar("OutputT", bound=JobOutputBase)


class RegisteredJob(TypedDict):
    handler: Callable
    input_type: type[JobInputBase]
    output_type: type[JobOutputBase] | None
    read_model: type[JobRead]  # the ONE concrete JobRead model for this job type
    generate_endpoints: EndpointGeneration
    publish_updates: bool
    priority: JobPriority
    device: Literal["gpu", "cpu", "api"]
    router: APIRouter | None
    result_ttl: int  # how long to keep successful jobs and their results (in seconds)
    # failure_ttl  # how long to keep failed jobs (defaults to 1 year)
    # ttl  # how long to keep jobs in queue before they are discarded (defaults to infinite)
    # see https://python-rq.org/docs/jobs/#job-creation
    retry: tuple[int, int] | None
    timeout: int  # maximum runtime before the job is interrupted and marked as failed (in seconds)
    enricher: Callable | None
    # checks the input when the generated endpoint starts a job (see register_job)
    validate_input: Callable[[Session, Any], None] | None


class JobHooks(NamedTuple):
    """Called by the job handler around every job (see `JobService.register_hooks`)."""

    # before the handler; returns the input the handler, `finished` and `failed`
    # get (the stored input or a narrowed copy of it), or None to skip the job; a
    # failing hook fails the job, and `failed` gets the stored input
    started: Callable[[JobType, JobInputBase], JobInputBase | None]
    # after the handler returned; a failing hook fails the job
    finished: Callable[[JobType, JobInputBase, JobOutputBase | None], None]
    # after the `started` hook, the handler or the `finished` hook raised
    failed: Callable[[JobType, JobInputBase], None]


_NO_HOOKS = JobHooks(
    started=lambda job_type, input: input,
    finished=lambda job_type, input, output: None,
    failed=lambda job_type, input: None,
)


class JobService(metaclass=SingletonMeta):
    def __init__(self):
        self.redis_conn: Redis | None = None
        self.queues: Dict[tuple[str, JobPriority], rq.Queue] = {}
        self.registries: dict[tuple[str, JobPriority], dict[str, BaseRegistry]] = {}
        self.job_registry: Dict[JobType, RegisteredJob] = {}
        self.hooks: JobHooks = _NO_HOOKS

    def initialize(self) -> None:
        """Initialize the JobService by connecting to Redis and setting up queues and registries."""

        self.redis_conn = RedisRepo().redis_connection()
        for device in ["cpu", "gpu", "api"]:
            for priority in [JobPriority.HIGH, JobPriority.DEFAULT, JobPriority.LOW]:
                qk = (device, priority)  # queue key
                qn = f"{device}-{priority.value}"  # queue name
                self.queues[qk] = rq.Queue(name=qn, connection=self.redis_conn)
                self.registries[qk] = {
                    "started": StartedJobRegistry(name=qn, connection=self.redis_conn),
                    "finished": FinishedJobRegistry(
                        name=qn, connection=self.redis_conn
                    ),
                    "failed": FailedJobRegistry(name=qn, connection=self.redis_conn),
                    "deferred": DeferredJobRegistry(
                        name=qn, connection=self.redis_conn
                    ),
                    "canceled": CanceledJobRegistry(
                        name=qn, connection=self.redis_conn
                    ),
                }

        logger.info("JobService initialized successfully!")

    def register_job(
        self,
        job_type: JobType,
        handler_func: Callable[[InputT, Job], OutputT | None],
        input_type: type[InputT],
        output_type: type[OutputT] | None,
        priority: JobPriority,
        device: Literal["gpu", "cpu", "api"],
        generate_endpoints: EndpointGeneration,
        publish_updates: bool,
        router: APIRouter | None,
        result_ttl: int,
        retry: tuple[int, int] | None,
        timeout: int,
        enricher: Callable[[InputT], InputT] | None = None,
        read_model: type[JobRead] | None = None,
        validate_input: Callable[[Session, InputT], None] | None = None,
    ) -> None:
        # Enforce that the only parameter is named 'payload'
        sig = inspect.signature(handler_func)
        params = list(sig.parameters.values())
        if (
            not params
            or len(params) != 2
            or params[0].name != "payload"
            or params[1].name != "job"
        ):
            raise ValueError(
                f"The parameters of function '{handler_func.__name__}' must be named 'payload, job'."
            )

        if self.job_registry.get(job_type) is not None:
            raise ValueError(f"JobType {job_type} is already registered!")

        # The ONE concrete JobRead model for this job type. Modules with
        # hand-written endpoints pass their own subclass (e.g. ImportJobRead);
        # all other jobs get an auto-generated model.
        if read_model is None:
            job_name = "".join([x.capitalize() for x in job_type.split("_")])
            read_model = create_model(
                f"{job_name}JobRead",
                __base__=JobRead[input_type, output_type],
                job_type=(
                    Literal[job_type.value],
                    Field(
                        description="Type of the job",
                        json_schema_extra={"enum": [job_type.value]},
                    ),
                ),
            )

        self.job_registry[job_type] = {
            "handler": handler_func,
            "input_type": input_type,
            "output_type": output_type,
            "read_model": read_model,
            "generate_endpoints": generate_endpoints,
            "publish_updates": publish_updates,
            "priority": priority,
            "device": device,
            "router": router,
            "result_ttl": result_ttl,
            "retry": retry,
            "timeout": timeout,
            "enricher": enricher,
            "validate_input": validate_input,
        }

    def register_hooks(self, hooks: JobHooks) -> None:
        """Set the hooks the job handler calls around every job. Registered at
        bootstrap (`bootstrap.register_jobs`), e.g. by the document processing,
        which tracks the pipeline step statuses and starts the next steps."""
        self.hooks = hooks

    def read_job_type(self, handler: Callable) -> JobType:
        """The job type registered with this handler. Raises if none is."""
        for job_type, job_info in self.job_registry.items():
            if job_info["handler"] is handler:
                return job_type
        raise ValueError(
            f"The function '{handler.__name__}' is not registered as a job handler."
        )

    def start_job(
        self,
        job_type: JobType,
        payload: JobInputBase,
        priority: JobPriority | None = None,
    ) -> Job:
        """Enqueue a job on the queue of its device, with its registered priority
        unless `priority` overrides it (e.g. low for bulk work in the background).

        Raises `JobInputError` if the input cannot be built (it does not
        validate and the enricher cannot complete it), and
        `JobQueueUnavailableError` if the queue (Redis) cannot be reached.
        Anything else, e.g. an unknown job type, raises as it is."""
        job_info = self.job_registry.get(job_type)
        if not job_info:
            raise ValueError(f"Unknown job type: {job_type}")

        # Validate payload is of correct subclass type
        input_type = job_info["input_type"]
        try:
            input_obj = input_type.model_validate(payload.model_dump())
        except Exception as e:
            # Use the enricher if available
            enricher = job_info.get("enricher")
            if not enricher:
                raise JobInputError(job_type, e) from e
            try:
                input_obj = enricher(payload)
                input_obj = input_type.model_validate(input_obj.model_dump())
            except Exception as enrich_e:
                raise JobInputError(job_type, enrich_e) from enrich_e

        # Enqueue the job
        from systems.job_system.job_handler import rq_job_handler

        retry = job_info["retry"]
        queue = self.queues[(job_info["device"], priority or job_info["priority"])]
        try:
            rq_job = queue.enqueue(
                rq_job_handler,
                # Our function parameters
                kwargs={
                    "jobtype": job_type,
                    "handler": job_info["handler"],
                    "payload": input_obj,
                },
                # RQ Parameters
                meta={
                    "type": job_type,
                    "status_message": "Job enqueued",
                    "project_id": input_obj.project_id,
                    "current_step": 0,
                    "steps": ["Initial step"],
                    "created": datetime.now(UTC),
                    "finished": None,
                    "device": job_info["device"],
                    "publish_updates": job_info["publish_updates"],
                },
                result_ttl=job_info["result_ttl"],
                retry=rq.Retry(max=retry[0], interval=retry[1]) if retry else None,
                job_timeout=job_info["timeout"],
            )
        except RedisError as e:
            raise JobQueueUnavailableError(job_type) from e
        job = Job(rq_job)

        from systems.job_system.job_events import publish_job_update

        publish_job_update(job)

        return job

    def get_job(self, job_id: str) -> Job:
        return Job(rq.job.Job.fetch(job_id, connection=self.redis_conn))

    def get_jobs_by_project(
        self,
        job_type: JobType,
        project_id: int,
    ) -> list[Job]:
        # determine queue
        job_info = self.job_registry.get(job_type)
        if not job_info:
            raise ValueError(f"Unknown job type: {job_type}")
        queue_key = (job_info["device"], job_info["priority"])
        queue = self.queues[queue_key]

        jobs = []

        # Get jobs from the job's queue (pending/enqueued jobs)
        for job in queue.get_jobs():
            if (
                job.meta.get("type") == job_type
                and job.meta.get("project_id") == project_id
                and self._matches_job_types(job, job_info)
            ):
                jobs.append(Job(job))

        # Get jobs from the queue's different registries (completed, failed, etc.)
        for registry in self.registries[queue_key].values():
            for job_id in registry.get_job_ids():
                try:
                    job = rq.job.Job.fetch(job_id, connection=self.redis_conn)
                    if (
                        job.meta.get("type") == job_type
                        and job.meta.get("project_id") == project_id
                        and self._matches_job_types(job, job_info)
                    ):
                        jobs.append(Job(job))
                except Exception:
                    # Job might have been deleted or corrupted, skip it
                    continue

        return jobs

    def _matches_job_types(self, job: rq.job.Job, job_info: RegisteredJob) -> bool:
        """
        Whether the stored input and output of a job still match the job's types.

        Redis keeps jobs with their pickled input and output for a long time
        (failed jobs for a year). A job created before its input or output type
        changed cannot be unpickled or lacks fields, so it cannot be read anymore.
        """
        try:
            job_info["input_type"].model_validate(job.kwargs["payload"].model_dump())
            output = job.return_value()
            if output is not None and job_info["output_type"] is not None:
                job_info["output_type"].model_validate(output.model_dump())
        except Exception:
            logger.debug(
                f"Skipping job {job.id}: its stored input or output does not match "
                "the current job types"
            )
            return False
        return True

    def get_failed_jobs_by_project(
        self, project_id: int, job_types: list[JobType] | None
    ) -> list[Job]:
        jobs = []

        for registry in self.registries.values():
            failed_registry = registry["failed"]
            for job_id in failed_registry.get_job_ids():
                try:
                    job = rq.job.Job.fetch(job_id, connection=self.redis_conn)
                    if job.meta.get("project_id") == project_id:
                        if job_types is None or job.meta.get("type") in job_types:
                            jobs.append(Job(job))
                except Exception:
                    # Job might have been deleted or corrupted, skip it
                    continue

        return jobs

    def stop_job(self, job_id: str) -> bool:
        job = rq.job.Job.fetch(job_id, connection=self.redis_conn)
        if job and job.is_started:
            job.cancel()

            # Push the CANCELED state to websocket clients (never raises)
            from systems.job_system.job_events import publish_job_update

            publish_job_update(Job(job))
            return True
        return False

    def retry_job(self, job_id: str) -> bool:
        job = rq.job.Job.fetch(job_id, connection=self.redis_conn)
        if job and job.is_failed:
            job.requeue()

            # Push the QUEUED state to websocket clients (never raises)
            from systems.job_system.job_events import publish_job_update

            publish_job_update(Job(job))
            return True
        return False

    def remove_jobs_by_project(self, project_id: int) -> int:
        removed_jobs = 0
        for registries in self.registries.values():
            for registry in registries.values():
                for job_id in registry.get_job_ids():
                    registry.remove(job_id, delete_job=True)
                    removed_jobs += 1

        logger.info(f"Removed {removed_jobs} jobs for project {project_id}")
        return removed_jobs
