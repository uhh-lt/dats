from fastapi import status

from common.exception_handler import exception_handler
from modules.llm_assistant.llm_assistant_enum import StrategyType, TaskType


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
class UnsupportedLLMAssistantStrategyError(Exception):
    """Raised when a strategy is requested for a task it does not support."""

    def __init__(self, task_type: TaskType, strategy_type: StrategyType) -> None:
        super().__init__(
            f"Strategy {strategy_type.value} is not supported for task {task_type.value}!"
        )


@exception_handler(status.HTTP_400_BAD_REQUEST)
class InvalidPromptTemplateError(Exception):
    """Raised when prompt templates violate the placeholder rules of a strategy."""

    def __init__(self, cause: str) -> None:
        super().__init__(f"Invalid prompt templates: {cause}")


@exception_handler(status.HTTP_400_BAD_REQUEST)
class InvalidCodeDefinitionsError(Exception):
    """Raised when code definitions do not match the selected project codes."""

    def __init__(self, cause: str) -> None:
        super().__init__(f"Invalid code definitions: {cause}")


@exception_handler(status.HTTP_400_BAD_REQUEST)
class InvalidPromptPreviewError(Exception):
    """Raised when a prompt preview requests a document or message that does not exist."""

    def __init__(self, cause: str) -> None:
        super().__init__(f"Cannot preview the prompt: {cause}")
