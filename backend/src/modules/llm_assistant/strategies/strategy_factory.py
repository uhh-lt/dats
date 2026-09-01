from sqlalchemy.orm import Session

from modules.llm_assistant.llm_job_dto import (
    LLMPromptTemplates,
    StrategyType,
    TaskType,
)
from modules.llm_assistant.strategies.fuzzy_grounding_strategy import (
    FuzzyGroundingStrategy,
)
from modules.llm_assistant.strategies.llm_strategy import LLMStrategy
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
    strategy_cls = STRATEGY_FOR_TASK_AND_STRATEGY.get((task_type, strategy_type))
    if strategy_cls is None:
        raise ValueError(
            f"Strategy {strategy_type} is not supported for task {task_type}"
        )
    return strategy_cls


def build_strategy(
    db: Session,
    project_id: int,
    is_fewshot: bool,
    task_type: TaskType,
    strategy_type: StrategyType,
    strategy_params=None,
    prompt_templates: list[LLMPromptTemplates] | None = None,
    params=None,
    example_ids: list[int] | None = None,
) -> LLMStrategy:
    """Instantiate the strategy for the given task and strategy type."""
    strategy_cls = get_strategy_class(task_type, strategy_type)

    # FuzzyGroundingStrategy takes strategy_params explicitly
    from modules.llm_assistant.strategies.fuzzy_grounding_strategy import (
        FuzzyGroundingStrategy,
    )

    if issubclass(strategy_cls, FuzzyGroundingStrategy):
        return strategy_cls(
            db=db,
            project_id=project_id,
            is_fewshot=is_fewshot,
            strategy_params=strategy_params,
            prompt_templates=prompt_templates,
            params=params,
            example_ids=example_ids,
        )

    return strategy_cls(
        db=db,
        project_id=project_id,
        is_fewshot=is_fewshot,
        prompt_templates=prompt_templates,
        params=params,
        example_ids=example_ids,
    )
