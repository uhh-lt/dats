from core.prompt_template.prompt_template_enum import OutputFormat
from core.prompt_template.prompt_template_renderer import PromptRenderer
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

# output format -> strategy class
STRATEGY_FOR_OUTPUT_FORMAT: dict[OutputFormat, type[LLMAssistantStrategy]] = {
    strategy_cls.output_format: strategy_cls
    for strategy_cls in (
        TaggingStrategy,
        MetadataStrategy,
        SentenceAnnotationStrategy,
        NERInlineTagStrategy,
        FuzzyGroundingStrategy,
    )
}


def build_strategy(renderer: PromptRenderer) -> LLMAssistantStrategy:
    """Instantiate the strategy of a prompt's output format."""
    return STRATEGY_FOR_OUTPUT_FORMAT[renderer.output_format](renderer=renderer)
