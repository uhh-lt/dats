from modules.llm_assistant.llm_job_dto import StrategyInfo, StrategyType, TaskType
from modules.llm_assistant.strategies.fuzzy_grounding_strategy import (
    FuzzyGroundingStrategy,
)
from modules.llm_assistant.strategies.metadata_strategy import MetadataStrategy
from modules.llm_assistant.strategies.ner_inline_tag_strategy import (
    NERInlineTagStrategy,
)
from modules.llm_assistant.strategies.sentence_annotation_strategy import (
    SentenceAnnotationStrategy,
)
from modules.llm_assistant.strategies.tagging_strategy import TaggingStrategy
from modules.llm_assistant.tasks.annotation_task import AnnotationTask
from modules.llm_assistant.tasks.llm_task import LLMTask
from modules.llm_assistant.tasks.metadata_extraction_task import (
    MetadataExtractionTask,
)
from modules.llm_assistant.tasks.sentence_annotation_task import SentenceAnnotationTask
from modules.llm_assistant.tasks.tagging_task import TaggingTask

# Any concrete strategy class (parametrized with its specific params type).
AnyStrategyClass = (
    type[TaggingStrategy]
    | type[MetadataStrategy]
    | type[NERInlineTagStrategy]
    | type[FuzzyGroundingStrategy]
    | type[SentenceAnnotationStrategy]
)

# task type -> task class
TASK_FOR_TASK_TYPE: dict[TaskType, type[LLMTask]] = {
    TaskType.TAGGING: TaggingTask,
    TaskType.METADATA_EXTRACTION: MetadataExtractionTask,
    TaskType.ANNOTATION: AnnotationTask,
    TaskType.SENTENCE_ANNOTATION: SentenceAnnotationTask,
}

# task type -> list of supported strategy classes (order = display order)
STRATEGIES_FOR_TASK_TYPE: dict[TaskType, list[AnyStrategyClass]] = {
    TaskType.TAGGING: [TaggingStrategy],
    TaskType.METADATA_EXTRACTION: [MetadataStrategy],
    TaskType.ANNOTATION: [NERInlineTagStrategy, FuzzyGroundingStrategy],
    TaskType.SENTENCE_ANNOTATION: [SentenceAnnotationStrategy],
}

# (task type, strategy type) -> strategy class
STRATEGY_FOR_TASK_AND_STRATEGY: dict[
    tuple[TaskType, StrategyType], AnyStrategyClass
] = {
    (task_type, strategy_cls.strategy_type): strategy_cls
    for task_type, strategy_clses in STRATEGIES_FOR_TASK_TYPE.items()
    for strategy_cls in strategy_clses
}


def get_task_class(task_type: TaskType) -> type[LLMTask]:
    task_cls = TASK_FOR_TASK_TYPE.get(task_type)
    if task_cls is None:
        raise ValueError(f"No task registered for task type {task_type}")
    return task_cls


def get_strategy_class(
    task_type: TaskType, strategy_type: StrategyType
) -> AnyStrategyClass:
    strategy_cls = STRATEGY_FOR_TASK_AND_STRATEGY.get((task_type, strategy_type))
    if strategy_cls is None:
        raise ValueError(
            f"Strategy {strategy_type} is not supported for task {task_type}"
        )
    return strategy_cls


def list_strategies(task_type: TaskType) -> list[StrategyInfo]:
    """Return StrategyInfo for all strategies supporting the given task."""
    infos: list[StrategyInfo] = []
    for strategy_cls in STRATEGIES_FOR_TASK_TYPE.get(task_type, []):
        infos.append(
            StrategyInfo(
                llm_strategy_type=strategy_cls.strategy_type,
                name=strategy_cls.display_name,
                description=strategy_cls.description,
                default_params=strategy_cls.default_params(),
                allowed_data_tags=list(strategy_cls.allowed_data_tags),
            )
        )
    return infos
