from collections.abc import Iterator
from typing import ClassVar

from pydantic import BaseModel

from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.prompt.prompt_enum import OutputFormat
from core.prompt.prompt_renderer import (
    PromptRenderer,
    PromptSegment,
)
from repos.llm_repo import LLMMessage


class LLMAssistantStrategy:
    """A strategy implements the output format of a prompt.

    The prompt (see ``core.prompt``) decides what the LLM sees: the
    renderer fills its blocks and splits documents into segments, one LLM message
    each. The strategy adds what the answers need:
    - the structured-output response model used for the LLM call
    - parsing of the LLM response (``parse_result`` of the concrete strategy)
    - grounding of parsed results to document offsets (where applicable)
    """

    # The output format this class implements.
    output_format: ClassVar[OutputFormat]

    def __init__(self, renderer: PromptRenderer):
        self.renderer = renderer
        self.prompt = renderer.prompt
        # the segments of the last document, parsers look them up by message id
        self._segments: tuple[int, list[PromptSegment]] | None = None

    @property
    def is_fewshot(self) -> bool:
        """A prompt that shows examples makes a few-shot run."""
        return self.renderer.is_fewshot

    def get_response_model(self) -> type[BaseModel]:
        """The pydantic model used as the structured-output schema."""
        raise NotImplementedError()

    def segments(self, sdoc_data: SourceDocumentDataORM) -> list[PromptSegment]:
        """The segments of a document, one per LLM message."""
        if self._segments is None or self._segments[0] != sdoc_data.id:
            self._segments = (sdoc_data.id, self.renderer.segments(sdoc_data))
        return self._segments[1]

    def generate_prompts(
        self, sdoc_data: SourceDocumentDataORM
    ) -> Iterator[LLMMessage]:
        """Yield the LLM messages required to process one document."""
        for segment in self.segments(sdoc_data):
            yield LLMMessage(user_prompt=self.renderer.render(segment))
