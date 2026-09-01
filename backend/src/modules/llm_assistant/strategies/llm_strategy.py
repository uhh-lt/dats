from abc import abstractmethod
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

from modules.llm_assistant.llm_job_dto import (
    SpecificStrategyParameters,
    StrategyType,
)
from modules.llm_assistant.prompts.prompt_builder import PromptBuilder

# The strategy params type
StrategyParamsT = TypeVar("StrategyParamsT", bound=SpecificStrategyParameters)


class LLMStrategy(PromptBuilder, Generic[StrategyParamsT]):
    """A strategy describes HOW the LLM assistant does a job.

    Extends the PromptBuilder template machinery with:
    - the structured-output response model used for the LLM call
    - parsing of the LLM response (``parse_result``)
    - grounding of parsed results to document offsets (where applicable)
    - chunking behaviour (via the DataTag mechanism)

    A strategy declares which DataTags (document content placeholders) it
    supports via ``valid_data_tags``; prompt validation fails fast if a
    template uses an unsupported tag.
    """

    #: The strategy type this class implements.
    strategy_type: StrategyType
    #: Human-readable name (shown in the frontend).
    display_name: str
    #: Explanation of what the strategy does (shown in the frontend).
    description: str
    #: The params model type for this strategy.
    strategy_params_type: type[StrategyParamsT]
    #: The DataTags this strategy supports (class-level, for introspection).
    allowed_data_tags: list[str] = []

    def get_response_model(self) -> type[BaseModel]:
        """The pydantic model used as the structured-output schema."""
        raise NotImplementedError()

    @abstractmethod
    def parse_result(self, result: Any) -> Any:
        """Parse a validated LLM response into the strategy's parsed result."""
        ...

    @classmethod
    def default_params(cls) -> StrategyParamsT:
        """Default strategy parameters."""
        return cls.strategy_params_type.model_validate(
            {"llm_strategy_type": cls.strategy_type}
        )
