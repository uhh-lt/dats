from pydantic import BaseModel

from core.prompt.prompt_enum import OutputFormat
from core.prompt.prompt_renderer import PromptRenderer
from modules.llm_assistant.strategies.llm_assistant_strategy import LLMAssistantStrategy


class LLMParsedTaggingResult(BaseModel):
    tag_ids: list[int]
    reasoning: str


class LLMTaggingResult(BaseModel):
    categories: list[str]
    reasoning: str


class TaggingStrategy(LLMAssistantStrategy):
    """Document tagging (<output-format:tags>): the LLM selects the prompt's tags."""

    output_format = OutputFormat.TAGS

    def __init__(self, renderer: PromptRenderer):
        super().__init__(renderer=renderer)
        self.tagname2id = {tag.name.lower(): tag.tag_id for tag in self.prompt.tags}

    def get_response_model(self) -> type[BaseModel]:
        return LLMTaggingResult

    def parse_result(self, result: LLMTaggingResult) -> LLMParsedTaggingResult:
        return LLMParsedTaggingResult(
            tag_ids=[
                self.tagname2id[category.lower()]
                for category in result.categories
                if category.lower() in self.tagname2id
            ],
            reasoning=result.reasoning,
        )
