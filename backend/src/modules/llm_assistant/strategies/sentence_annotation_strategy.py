from pydantic import BaseModel, Field

from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.prompt.prompt_enum import OutputFormat
from modules.llm_assistant.strategies.code_annotation_strategy import (
    CodeAnnotationStrategy,
)
from modules.llm_assistant.strategies.types.parsed_sentence import ParsedSentence


class LLMSentenceAnnotationResult(BaseModel):
    sent_id: int
    category: str


class LLMSentenceAnnotationResultWithReasoning(LLMSentenceAnnotationResult):
    reasoning: str = Field(
        description="A short reasoning (one or two sentences) why the sentence fits its category"
    )


class LLMSentenceAnnotationResults(BaseModel):
    data: list[LLMSentenceAnnotationResult]


class LLMSentenceAnnotationResultsWithReasoning(BaseModel):
    data: list[LLMSentenceAnnotationResultWithReasoning]


class SentenceAnnotationStrategy(CodeAnnotationStrategy):
    """Sentence annotation via sentence numbers (<output-format:sentences>).

    The segments show numbered sentences (sentence index + 1). The LLM answers
    the number and the code of every sentence that fits a code.
    """

    output_format = OutputFormat.SENTENCES

    def get_response_model(
        self,
    ) -> (
        type[LLMSentenceAnnotationResults]
        | type[LLMSentenceAnnotationResultsWithReasoning]
    ):
        """The classified sentences, each with a reasoning if the prompt requests it."""
        if self.prompt.settings.request_reasoning:
            return LLMSentenceAnnotationResultsWithReasoning
        return LLMSentenceAnnotationResults

    def parse_result(
        self,
        result: LLMSentenceAnnotationResults
        | LLMSentenceAnnotationResultsWithReasoning,
        sdoc_data: SourceDocumentDataORM,
        message_id: int,
    ) -> list[ParsedSentence]:
        """Return the classified sentences of the message's sentences."""
        sentence_ids = set(self.segments(sdoc_data)[message_id].sentence_ids)
        parsed: list[ParsedSentence] = []
        for annotation in result.data:
            code_id = self._code_id_for_name(annotation.category)
            if code_id is None or annotation.sent_id - 1 not in sentence_ids:
                continue
            parsed.append(
                ParsedSentence(
                    sentence_id=annotation.sent_id - 1,
                    code_id=code_id,
                    reasoning=(
                        annotation.reasoning
                        if isinstance(
                            annotation, LLMSentenceAnnotationResultWithReasoning
                        )
                        else None
                    ),
                )
            )
        return parsed
