from fastapi import status

from common.exception_handler import exception_handler
from core.prompt.prompt_enum import TaskType


class LLMAssistantJobPreparationError(Exception):
    def __init__(self, cause: Exception | str) -> None:
        super().__init__(f"Cannot prepare and create the LLMAssistantJob! {cause}")


class LLMAssistantJobAlreadyStartedOrDoneError(Exception):
    def __init__(self, job_id: str) -> None:
        super().__init__(
            f"The LLMAssistantJob with ID {job_id} already started or is done!"
        )


class NoSuchLLMAssistantJobError(Exception):
    def __init__(self, job_id: str, cause: Exception) -> None:
        super().__init__(f"There exists not LLMAssistantJob with ID {job_id}! {cause}")


class UnsupportedLLMAssistantJobTypeError(Exception):
    def __init__(self, task_type: TaskType) -> None:
        super().__init__(f"LLMAssistantJobType {task_type} is not supported! ")


class LLMAssistantBatchProcessingError(Exception):
    def __init__(self, message: str, raw_response: str | None = None):
        super().__init__(message)
        self.raw_response = raw_response


@exception_handler(status.HTTP_400_BAD_REQUEST)
class LLMAssistantDocumentsNotInProjectError(Exception):
    """Raised when an LLM Assistant job is started with documents of another
    project (or documents that do not exist)."""

    def __init__(self, project_id: int, sdoc_ids: list[int]) -> None:
        super().__init__(
            f"The source documents {sdoc_ids} do not belong to project {project_id}."
        )
