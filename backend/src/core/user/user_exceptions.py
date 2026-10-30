from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class NotAVirtualAnnotatorError(Exception):
    """Raised when an operation that only applies to virtual annotators (rename,
    delete, LLM Assistant target, ...) gets a human user or a user of another
    project."""

    def __init__(self, user_id: int, project_id: int | None = None) -> None:
        project_note = f" of project {project_id}" if project_id is not None else ""
        super().__init__(f"User {user_id} is not a virtual annotator{project_note}.")


@exception_handler(status.HTTP_400_BAD_REQUEST)
class VirtualUserNotAllowedError(Exception):
    """Raised when a virtual annotator is used where only human users are
    allowed (e.g. as project member)."""

    def __init__(self, user_id: int) -> None:
        super().__init__(
            f"User {user_id} is a virtual annotator and cannot be a project member."
        )
