from fastapi import status

from common.exception_handler import exception_handler


class JobInputError(Exception):
    """Raised by `JobService.start_job` when the input of a job cannot be built:
    it does not validate, and the job's enricher cannot complete it (e.g. the
    data it loads is missing)."""

    def __init__(self, job_type: str, cause: Exception) -> None:
        super().__init__(f"Invalid input for job type {job_type}: {cause}")


@exception_handler(status.HTTP_503_SERVICE_UNAVAILABLE)
class JobQueueUnavailableError(Exception):
    """Raised by `JobService.start_job` when the job cannot be enqueued because
    the queue (Redis) cannot be reached."""

    def __init__(self, job_type: str) -> None:
        super().__init__(
            f"The job queue cannot be reached, so the job {job_type} was not "
            "started. Try again later."
        )


class JobStoppedError(BaseException):
    """Ends a job that `JobService.stop_job` stopped: raised in the job by the
    worker that runs it, or passed to the job's failure callback by the worker
    that killed its process. Like `KeyboardInterrupt`, it is no `Exception`, so
    `except Exception` does not swallow the stop; a handler that must react to
    it (e.g. to record the failure) catches it explicitly."""

    def __init__(self) -> None:
        super().__init__("The job was stopped")
