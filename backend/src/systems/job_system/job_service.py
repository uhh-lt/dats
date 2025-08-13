import inspect
from datetime import datetime
from typing import Callable, Dict, Literal, TypedDict, TypeVar

import redis
import rq
from common.job_type import JobType
from common.singleton_meta import SingletonMeta
from config import conf
from fastapi import APIRouter
from loguru import logger
from rq.registry import (
    CanceledJobRegistry,
    DeferredJobRegistry,
    FailedJobRegistry,
    FinishedJobRegistry,
    StartedJobRegistry,
)
from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobOutputBase,
    JobPriority,
)

InputT = TypeVar("InputT", bound=JobInputBase)
OutputT = TypeVar("OutputT", bound=JobOutputBase)


class RegisteredJob(TypedDict):
    handler: Callable
    input_type: type[JobInputBase]
    output_type: type[JobOutputBase] | None
    generate_endpoints: EndpointGeneration
    priority: JobPriority
    device: Literal["gpu", "cpu"]
    router: APIRouter | None


class JobService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        try:
            # setup redis
            r_host = conf.redis.host
            r_port = conf.redis.port
            r_pass = conf.redis.password
            rq_idx = conf.redis.rq_idx

            cls.redis_conn = redis.Redis(
                host=r_host, port=r_port, db=rq_idx, password=r_pass
            )
            assert cls.redis_conn.ping(), (
                f"Couldn't connect to Redis {str(cls.redis_conn)} "
                f"DB #{rq_idx} at {r_host}:{r_port}!"
            )
            logger.info(
                f"Successfully connected to Redis {str(cls.redis_conn)} DB #{rq_idx}"
            )

        except Exception as e:
            msg = f"Cannot connect to Redis DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

        # Define priority queues
        cls.queues = {
            ("default", JobPriority.HIGH): rq.Queue(
                "default-high", connection=cls.redis_conn
            ),
            ("default", JobPriority.DEFAULT): rq.Queue(
                "default-default", connection=cls.redis_conn
            ),
            ("default", JobPriority.LOW): rq.Queue(
                "default-low", connection=cls.redis_conn
            ),
            ("cpu", JobPriority.HIGH): rq.Queue("cpu-high", connection=cls.redis_conn),
            ("cpu", JobPriority.DEFAULT): rq.Queue(
                "cpu-default", connection=cls.redis_conn
            ),
            ("cpu", JobPriority.LOW): rq.Queue("cpu-low", connection=cls.redis_conn),
            ("gpu", JobPriority.HIGH): rq.Queue("gpu-high", connection=cls.redis_conn),
            ("gpu", JobPriority.DEFAULT): rq.Queue(
                "gpu-default", connection=cls.redis_conn
            ),
            ("gpu", JobPriority.LOW): rq.Queue("gpu-low", connection=cls.redis_conn),
        }

        # Configure job registries with custom TTL settings
        # Custom TTL values (in seconds)
        TTL_90_DAYS = 90 * 24 * 60 * 60  # 90 days

        cls.registries = {
            "started": StartedJobRegistry(connection=cls.redis_conn),
            "finished": FinishedJobRegistry(connection=cls.redis_conn),
            "failed": FailedJobRegistry(connection=cls.redis_conn),
            "deferred": DeferredJobRegistry(connection=cls.redis_conn),
            "canceled": CanceledJobRegistry(connection=cls.redis_conn),
        }

        # Configure custom TTL for registries
        cls.registries["finished"].default_job_timeout = TTL_90_DAYS
        cls.registries["failed"].default_job_timeout = TTL_90_DAYS
        cls.registries["canceled"].default_job_timeout = TTL_90_DAYS

        cls.job_registry: Dict[JobType, RegisteredJob] = {}
        return super(JobService, cls).__new__(cls)

    def register_job(
        self,
        job_type: JobType,
        handler_func: Callable[[InputT, Job], OutputT | None],
        input_type: type[InputT],
        output_type: type[OutputT] | None,
        priority: JobPriority,
        device: Literal["gpu", "cpu"],
        generate_endpoints: EndpointGeneration,
        router: APIRouter | None,
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

        self.job_registry[job_type] = {
            "handler": handler_func,
            "input_type": input_type,
            "output_type": output_type,
            "generate_endpoints": generate_endpoints,
            "priority": priority,
            "device": device,
            "router": router,
        }

    # Removed handler_wrapper; use top-level rq_job_handler instead

    def start_job(
        self,
        job_type: JobType,
        payload: JobInputBase,
        priority: JobPriority | None = None,
    ) -> Job:
        from systems.job_system.job_handler import rq_job_handler

        job_info = self.job_registry.get(job_type)
        if not job_info:
            raise ValueError(f"Unknown job type: {job_type}")
        handler = job_info["handler"]
        input_type = job_info["input_type"]
        device = job_info["device"]

        # priority can be used to override the registered priority level
        queue = self.queues[
            (device, job_info["priority"]) if priority is None else (device, priority)
        ]

        # Validate payload is of correct subclass type
        input_obj = input_type.model_validate(payload.model_dump())

        rq_job = queue.enqueue(
            rq_job_handler,
            jobtype=job_type,
            handler=handler,
            payload=input_obj,
            meta={
                "type": job_type,
                "status_message": "Job enqueued",
                "project_id": input_obj.project_id,
                "current_step": 0,
                "steps": ["Initial step"],
                "created": datetime.now(),
                "finished": None,
            },
        )
        return Job(rq_job)

    def get_job(self, job_id: str) -> Job:
        return Job(rq.job.Job.fetch(job_id, connection=self.redis_conn))

    def get_jobs_by_project(
        self,
        job_type: str,
        project_id: int,
    ) -> list[Job]:
        jobs = []

        # Get jobs from all queues (pending/enqueued jobs)
        for queue in self.queues.values():
            for job in queue.get_jobs():
                if (
                    job.meta.get("type") == job_type
                    and job.meta.get("project_id") == project_id
                ):
                    jobs.append(Job(job))

        # Get jobs from different registries (completed, failed, etc.)
        for registry in self.registries.values():
            for job_id in registry.get_job_ids():
                try:
                    job = rq.job.Job.fetch(job_id, connection=self.redis_conn)
                    if (
                        job.meta.get("type") == job_type
                        and job.meta.get("project_id") == project_id
                    ):
                        jobs.append(Job(job))
                except Exception:
                    # Job might have been deleted or corrupted, skip it
                    continue

        return jobs

    def stop_job(self, job_id: str) -> bool:
        job = rq.job.Job.fetch(job_id, connection=self.redis_conn)
        if job and job.is_started:
            job.cancel()
            return True
        return False

    def retry_job(self, job_id: str) -> bool:
        job = rq.job.Job.fetch(job_id, connection=self.redis_conn)
        if job and job.is_failed:
            job.requeue()
            return True
        return False
