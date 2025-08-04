from modules.llm_assistant.llm_job_dto import TaskType


class LLMJobPreparationError(Exception):
    def __init__(self, cause: Exception | str) -> None:
        super().__init__(f"Cannot prepare and create the LLMJob! {cause}")


class LLMJobAlreadyStartedOrDoneError(Exception):
    def __init__(self, llm_job_id: str) -> None:
        super().__init__(f"The LLMJob with ID {llm_job_id} already started or is done!")


class NoSuchLLMJobError(Exception):
    def __init__(self, llm_job_id: str, cause: Exception) -> None:
        super().__init__(f"There exists not LLMJob with ID {llm_job_id}! {cause}")


class UnsupportedLLMJobTypeError(Exception):
    def __init__(self, llm_job_type: TaskType) -> None:
        super().__init__(f"LLMJobType {llm_job_type} is not supported! ")
