from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class PerspectivesJobRunningError(Exception):
    """Raised when a PerspectivesJob is started while a job of the aspect runs."""

    def __init__(self, job_id: str) -> None:
        super().__init__(
            f"PerspectivesJob {job_id} is still running. Please wait until it is finished."
        )


@exception_handler(status.HTTP_409_CONFLICT)
class PerspectivesDataIncompleteError(Exception):
    """Raised when the map of an aspect is read while its data is incomplete."""

    def __init__(self, aspect_id: int, reason: str) -> None:
        super().__init__(f"The map of aspect {aspect_id} is incomplete: {reason}")
