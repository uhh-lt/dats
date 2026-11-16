from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_409_CONFLICT)
class SystemCodeConflictError(Exception):
    """Raised when a system code cannot be created because a code of its name
    exists in the project as a user code or with another parent."""

    def __init__(self, project_id: int, name: str, reason: str) -> None:
        super().__init__(
            f"The system code '{name}' cannot be created in project {project_id}: "
            f"{reason}"
        )
