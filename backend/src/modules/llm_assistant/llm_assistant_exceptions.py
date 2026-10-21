from modules.llm_assistant.llm_assistant_enum import TaskType


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
