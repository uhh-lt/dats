from fastapi import status

from common.exception_handler import exception_handler
from common.job_type_enum import JobType


class JobInputError(Exception):
    """Raised by `JobService.start_job` when the input of a job cannot be built:
    it does not validate, and the job's enricher cannot complete it (e.g. the
    data it loads is missing)."""

    def __init__(self, job_type: JobType, cause: Exception) -> None:
        super().__init__(f"Invalid input for job type {job_type.value}: {cause}")


@exception_handler(status.HTTP_503_SERVICE_UNAVAILABLE)
class JobQueueUnavailableError(Exception):
    """Raised by `JobService.start_job` when the job cannot be enqueued because
    the queue (Redis) cannot be reached."""

    def __init__(self, job_type: JobType) -> None:
        super().__init__(
            f"The job queue cannot be reached, so the job {job_type.value} was not "
            "started. Try again later."
        )
