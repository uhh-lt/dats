from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class NotAVirtualUserError(Exception):
    """Raised when an operation that only applies to virtual users (rename,
    delete, LLM Assistant target, annotate as, ...) gets another user or a virtual
    user of another project."""

    def __init__(self, user_id: int, project_id: int | None = None) -> None:
        project_note = f" of project {project_id}" if project_id is not None else ""
        super().__init__(f"User {user_id} is not a virtual user{project_note}.")
