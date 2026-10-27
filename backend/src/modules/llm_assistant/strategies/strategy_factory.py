from sqlalchemy.orm import Session

from modules.llm_assistant.llm_assistant_enum import StrategyType, TaskType
from modules.llm_assistant.llm_assistant_exceptions import (
    UnsupportedLLMAssistantStrategyError,
)
from modules.llm_assistant.llm_assistant_job_dto import (
    AnnotationParams,
    DocumentBasedTaskParams,
    FuzzyGroundingStrategyParams,
    LLMAssistantPromptTemplates,
    SpecificStrategyParameters,
)
from modules.llm_assistant.strategies.fuzzy_grounding_strategy import (
    FuzzyGroundingStrategy,
)
from modules.llm_assistant.strategies.llm_assistant_strategy import LLMAssistantStrategy
from modules.llm_assistant.strategies.metadata_strategy import MetadataStrategy
from modules.llm_assistant.strategies.ner_inline_tag_strategy import (
    NERInlineTagStrategy,
)
from modules.llm_assistant.strategies.sentence_annotation_strategy import (
    SentenceAnnotationStrategy,
)
from modules.llm_assistant.strategies.tagging_strategy import TaggingStrategy

# Any concrete strategy class (parametrized with its specific params type).
AnyStrategyClass = (
    type[TaggingStrategy]
    | type[MetadataStrategy]
    | type[NERInlineTagStrategy]
    | type[FuzzyGroundingStrategy]
    | type[SentenceAnnotationStrategy]
)

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


def get_strategy_class(
    task_type: TaskType, strategy_type: StrategyType
) -> AnyStrategyClass:
    """Return the strategy class registered for a task and strategy type."""
    strategy_cls = STRATEGY_FOR_TASK_AND_STRATEGY.get((task_type, strategy_type))
    if strategy_cls is None:
        raise UnsupportedLLMAssistantStrategyError(task_type, strategy_type)
    return strategy_cls


def build_strategy(
    db: Session,
    project_id: int,
    is_fewshot: bool,
    task_type: TaskType,
    strategy_type: StrategyType,
    params: DocumentBasedTaskParams,
    strategy_params: SpecificStrategyParameters | None = None,
    prompt_templates: list[LLMAssistantPromptTemplates] | None = None,
    example_ids: list[int] | None = None,
) -> LLMAssistantStrategy:
    """Instantiate the strategy for the given task and strategy type.

    Without prompt templates, the strategy builds its default templates from the
    task parameters.
    """
    strategy_cls = get_strategy_class(task_type, strategy_type)

    # FuzzyGroundingStrategy takes strategy_params explicitly
    if issubclass(strategy_cls, FuzzyGroundingStrategy):
        assert isinstance(params, AnnotationParams)
        assert strategy_params is None or isinstance(
            strategy_params, FuzzyGroundingStrategyParams
        )
        return strategy_cls(
            db=db,
            project_id=project_id,
            is_fewshot=is_fewshot,
            params=params,
            strategy_params=strategy_params,
            prompt_templates=prompt_templates,
            example_ids=example_ids,
        )

    return strategy_cls(
        db=db,
        project_id=project_id,
        is_fewshot=is_fewshot,
        params=params,  # type: ignore[arg-type]
        prompt_templates=prompt_templates,
        example_ids=example_ids,
    )
