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


class LLMAssistantRequestsFailedError(Exception):
    """Raised when the LLM was unavailable for every request of a batch of
    documents (it could not be reached, timed out or failed with a server
    error): the job fails before the batch is saved, instead of saving error
    results for the whole corpus. A retry continues with that batch."""

    def __init__(self, num_requests: int, first_error: str) -> None:
        super().__init__(
            f"All {num_requests} LLM requests of a batch of documents failed, "
            f"the LLM may be unreachable. First error: {first_error}"
        )
