from pydantic import BaseModel

from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.prompt_template.prompt_template_enum import OutputFormat
from modules.llm_assistant.strategies.code_annotation_strategy import (
    CodeAnnotationStrategy,
)


class LLMSentenceAnnotationResult(BaseModel):
    sent_id: int
    category: str


class LLMSentenceAnnotationResults(BaseModel):
    data: list[LLMSentenceAnnotationResult]


class SentenceAnnotationStrategy(CodeAnnotationStrategy):
    """Sentence annotation via sentence numbers (<output-format:sentences>).

    The segments show numbered sentences (sentence index + 1). The LLM answers
    the number and the code of every sentence that fits a code.
    """

    output_format = OutputFormat.SENTENCES

    def get_response_model(self) -> type[BaseModel]:
        return LLMSentenceAnnotationResults

    def parse_result(
        self,
        result: LLMSentenceAnnotationResults,
        sdoc_data: SourceDocumentDataORM,
        message_id: int,
    ) -> list[tuple[int, int]]:
        """Return the (sentence index, code id) pairs of the message's sentences."""
        sentence_ids = set(self.segments(sdoc_data)[message_id].sentence_ids)
        pairs: list[tuple[int, int]] = []
        for annotation in result.data:
            code_id = self._code_id_for_name(annotation.category)
            if code_id is None or annotation.sent_id - 1 not in sentence_ids:
                continue
            pairs.append((annotation.sent_id - 1, code_id))
        return pairs
