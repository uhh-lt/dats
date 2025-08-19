import inspect
from datetime import datetime
from typing import Callable, Dict, Literal, TypedDict, TypeVar

import redis
import rq
from fastapi import APIRouter
from loguru import logger
from rq.registry import (
    BaseRegistry,
    CanceledJobRegistry,
    DeferredJobRegistry,
    FailedJobRegistry,
    FinishedJobRegistry,
    StartedJobRegistry,
)

from common.job_type import JobType
from common.singleton_meta import SingletonMeta
from config import conf
from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobOutputBase,
    JobPriority,
    JobResultTTL,
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
    result_ttl: JobResultTTL  # how long to keep successful jobs and their results (defaults to 500 seconds)
    # failure_ttl  # how long to keep failed jobs (defaults to 1 year)
    # ttl  # how long to keep jobs in queue before they are discarded (defaults to infinite)
    # timeout  # specifies maximum runtime before the job is interrupted and marked as failed
    # see https://python-rq.org/docs/jobs/#job-creation


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

        # Define priority queues and their registries (every queue has its own 5 registries)
        cls.queues: Dict[tuple[str, JobPriority], rq.Queue] = {}
        cls.registries: dict[tuple[str, JobPriority], dict[str, BaseRegistry]] = {}
        for device in ["cpu", "gpu"]:
            for priority in [JobPriority.HIGH, JobPriority.DEFAULT, JobPriority.LOW]:
                qk = (device, priority)  # queue key
                qn = f"{device}-{priority.value}"  # queue name
                cls.queues[qk] = rq.Queue(name=qn, connection=cls.redis_conn)
                cls.registries[qk] = {
                    "started": StartedJobRegistry(name=qn, connection=cls.redis_conn),
                    "finished": FinishedJobRegistry(name=qn, connection=cls.redis_conn),
                    "failed": FailedJobRegistry(name=qn, connection=cls.redis_conn),
                    "deferred": DeferredJobRegistry(name=qn, connection=cls.redis_conn),
                    "canceled": CanceledJobRegistry(name=qn, connection=cls.redis_conn),
                }

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
        result_ttl: JobResultTTL = JobResultTTL.DEFAULT,
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
            "result_ttl": result_ttl,
        }

    def start_job(
        self,
        job_type: JobType,
        payload: JobInputBase,
    ) -> Job:
        from systems.job_system.job_handler import rq_job_handler

        job_info = self.job_registry.get(job_type)
        if not job_info:
            raise ValueError(f"Unknown job type: {job_type}")

        # Validate payload is of correct subclass type
        input_type = job_info["input_type"]
        input_obj = input_type.model_validate(payload.model_dump())

        # Enqueue the job
        queue = self.queues[(job_info["device"], job_info["priority"])]
        rq_job = queue.enqueue(
            rq_job_handler,
            jobtype=job_type,
            handler=job_info["handler"],
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
            result_ttl=job_info["result_ttl"].value,
            retry=rq.Retry(max=3, interval=30),
        )
        return Job(rq_job)

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
