from modules.llm_assistant.llm_job_dto import TaskType
from modules.llm_assistant.tasks.annotation_task import AnnotationTask
from modules.llm_assistant.tasks.llm_task import LLMTask
from modules.llm_assistant.tasks.metadata_extraction_task import (
    MetadataExtractionTask,
)
from modules.llm_assistant.tasks.sentence_annotation_task import SentenceAnnotationTask
from modules.llm_assistant.tasks.tagging_task import TaggingTask
from repos.llm_repo import LLMRepo

# task type -> task class
TASK_FOR_TASK_TYPE: dict[TaskType, type[LLMTask]] = {
    TaskType.TAGGING: TaggingTask,
    TaskType.METADATA_EXTRACTION: MetadataExtractionTask,
    TaskType.ANNOTATION: AnnotationTask,
    TaskType.SENTENCE_ANNOTATION: SentenceAnnotationTask,
}


def get_task_class(task_type: TaskType) -> type[LLMTask]:
    """Return the task class registered for a task type."""
    task_cls = TASK_FOR_TASK_TYPE.get(task_type)
    if task_cls is None:
        raise ValueError(f"No task registered for task type {task_type}")
    return task_cls


def build_task(task_type: TaskType, llm: LLMRepo) -> LLMTask:
    """Instantiate the LLMTask for the given task type."""
    task_cls = get_task_class(task_type)
    return task_cls(llm=llm)
