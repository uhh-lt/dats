import os
from typing import Callable, TypeVar

from pydantic import BaseModel
from systems.job_system.job_dto import JobInputBase

InputT = TypeVar("InputT", bound=JobInputBase)
OutputT = TypeVar("OutputT", bound=BaseModel)


def register_job(
    job_type: str,
    input_type: type[InputT],
    output_type: type[OutputT],
    generate_endpoints: bool,
):
    def decorator(func: Callable[[InputT], OutputT]):
        # Only register jobs if running in API context
        if os.environ.get("BACKEND_TYPE") == "api":
            from systems.job_system.job_service import JobService

            JobService().register_job_type(
                job_type,
                func,
                input_type=input_type,
                output_type=output_type,
                generate_endpoints=generate_endpoints,
            )
        return func

    return decorator
