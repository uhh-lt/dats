from fastapi import status

from common.exception_handler import exception_handler
from core.prompt.prompt_enum import TaskType


@exception_handler(status.HTTP_400_BAD_REQUEST)
class InvalidPromptError(Exception):
    """Raised when a prompt violates the block rules of its task."""

    def __init__(self, cause: str) -> None:
        super().__init__(f"Invalid prompt: {cause}")


@exception_handler(status.HTTP_400_BAD_REQUEST)
class InvalidPromptExampleError(Exception):
    """Raised when few-shot examples do not fit the prompt or project."""

    def __init__(self, cause: str) -> None:
        super().__init__(f"Invalid prompt examples: {cause}")


@exception_handler(status.HTTP_400_BAD_REQUEST)
class PromptMismatchError(Exception):
    """Raised when a prompt version is used for another project or task."""

    def __init__(self, version_id: int, project_id: int, task_type: TaskType) -> None:
        super().__init__(
            f"Prompt version {version_id} cannot be used in project "
            f"{project_id} for task {task_type.value}."
        )


@exception_handler(status.HTTP_400_BAD_REQUEST)
class InvalidPromptPreviewError(Exception):
    """Raised when a prompt preview requests a document or message that does not exist."""

    def __init__(self, cause: str) -> None:
        super().__init__(f"Cannot preview the prompt: {cause}")
