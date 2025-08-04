import os
from typing import Callable, TypeVar

from fastapi import APIRouter
from pydantic import BaseModel
from systems.job_system.job_dto import EndpointGeneration, JobInputBase, JobPriority

InputT = TypeVar("InputT", bound=JobInputBase)
OutputT = TypeVar("OutputT", bound=BaseModel)


def register_job(
    job_type: str,
    input_type: type[InputT],
    output_type: type[OutputT],
    priority: JobPriority,
    generate_endpoints: EndpointGeneration,
    router: APIRouter | None = None,
):
    def decorator(func: Callable[[InputT], OutputT]):
        # Only register jobs if running in API context
        if os.environ.get("BACKEND_TYPE") == "api":
            from systems.job_system.job_service import JobService

            JobService().register_job(
                job_type,
                func,
                input_type=input_type,
                output_type=output_type,
                priority=priority,
                generate_endpoints=generate_endpoints,
                router=router,
            )
        return func

    return decorator
