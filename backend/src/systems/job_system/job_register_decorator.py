from typing import Callable, Literal, TypeVar

from fastapi import APIRouter

from common.job_type import JobType
from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobOutputBase,
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
    router: APIRouter | None = None,
    result_ttl: JobTiming = JobTiming.TEN_MINUTES,
    retry: tuple[int, int] | None = None,
    timeout: JobTiming = JobTiming.ONE_HOUR,  # (RQ default is 3 min [180])
):
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
            router=router,
            result_ttl=result_ttl,
            retry=retry,
            timeout=timeout,
        )
        return func

    return decorator
