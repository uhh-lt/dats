from typing import Callable, Literal, TypeVar

from fastapi import APIRouter
from sqlalchemy.orm import Session

from common.job_type_enum import JobType
from systems.job_system.job_dto import Job, JobInputBase, JobOutputBase, JobRead
from systems.job_system.job_system_enum import (
    EndpointGeneration,
    JobPriority,
    JobTiming,
)

InputT = TypeVar("InputT", bound=JobInputBase)
OutputT = TypeVar("OutputT", bound=JobOutputBase)


def register_job(
    job_type: JobType,
    input_type: type[InputT],
    output_type: type[OutputT] | None = None,
    priority: JobPriority = JobPriority.DEFAULT,
    device: Literal["gpu", "cpu", "api"] = "cpu",
    generate_endpoints: EndpointGeneration = EndpointGeneration.NONE,
    publish_updates: bool = False,
    router: APIRouter | None = None,
    result_ttl: JobTiming = JobTiming.TEN_MINUTES,
    retry: tuple[int, int] | None = None,
    timeout: JobTiming = JobTiming.ONE_HOUR,  # (RQ default is 3 min [180])
    enricher: Callable[[InputT], InputT] | None = None,
    read_model: type[JobRead] | None = None,
    validate_input: Callable[[Session, InputT], None] | None = None,
):
    """
    Register a job handler with the job system.

    `validate_input` checks the input when the generated start endpoint starts a
    job, after the project membership check and before the job is enqueued. It
    raises an exception (e.g. a 400 or 403 error) to reject the input.
    """

    def decorator(func: Callable[[InputT, Job], OutputT | None]):
        from systems.job_system.job_service import JobService

        JobService().register_job(
            job_type,
            func,
            input_type=input_type,
            output_type=output_type,
            priority=priority,
            device=device,
            generate_endpoints=generate_endpoints,
            publish_updates=publish_updates,
            router=router,
            result_ttl=result_ttl,
            retry=retry,
            timeout=timeout,
            enricher=enricher,
            read_model=read_model,
            validate_input=validate_input,
        )
        return func

    return decorator
