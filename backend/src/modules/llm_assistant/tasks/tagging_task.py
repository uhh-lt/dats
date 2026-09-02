from sqlalchemy.orm import Session

from core.doc.source_document_crud import crud_sdoc
from modules.llm_assistant.llm_job_dto import (
    ApproachRecommendation,
    ApproachType,
    LLMJobOutput,
    SpecificTaskParameters,
    TaggingLLMJobResult,
    TaggingParams,
    TaggingResult,
    TaskType,
)
from modules.llm_assistant.strategies.tagging_strategy import (
    LLMTaggingResult,
    TaggingStrategy,
)
from modules.llm_assistant.tasks.llm_document_processor import LLMDocumentResponse
from modules.llm_assistant.tasks.llm_task import LLMTask, LLMTaskContext


class TaggingTask(
    LLMTask[TaggingStrategy, TaggingParams, LLMTaggingResult, TaggingResult]
):
    """Generate document-tagging suggestions for source documents."""

    task_name = "Document Tagging"

    @classmethod
    def determine_approach(
        cls, db: Session, task_parameters: SpecificTaskParameters
    ) -> ApproachRecommendation:
        return ApproachRecommendation(
            recommended_approach=ApproachType.LLM_ZERO_SHOT,
            available_approaches={
                ApproachType.LLM_ZERO_SHOT: True,
                ApproachType.LLM_FEW_SHOT: False,
            },
            reasoning="Only zero-shot approach is available for document tagging (yet).",
        )

    def _get_response_model(self, strategy: TaggingStrategy) -> type[LLMTaggingResult]:
        return LLMTaggingResult

    def _process_document(
        self,
        *,
        context: LLMTaskContext[TaggingStrategy, TaggingParams],
        document: LLMDocumentResponse[LLMTaggingResult],
    ) -> TaggingResult:
        current_tag_ids = [
            tag.id
            for tag in crud_sdoc.read(db=context.db, id=document.sdoc_data.id).tags
        ]
        if len(document.responses) != 1:
            return TaggingResult(
                status="error",
                status_message="Expected exactly one LLM response for document tagging",
                sdoc_id=document.sdoc_data.id,
                suggested_tag_ids=[],
                current_tag_ids=current_tag_ids,
                reasoning="",
            )

        response = document.responses[0].response
        if response.is_error or response.parsed is None:
            return TaggingResult(
                status="error",
                status_message=response.error or "Unknown LLM error",
                sdoc_id=document.sdoc_data.id,
                suggested_tag_ids=[],
                current_tag_ids=current_tag_ids,
                reasoning="",
            )

        parsed_result = context.strategy.parse_result(result=response.parsed)
        return TaggingResult(
            status="finished",
            status_message="Document tagging successful",
            sdoc_id=document.sdoc_data.id,
            suggested_tag_ids=parsed_result.tag_ids,
            current_tag_ids=current_tag_ids,
            reasoning=parsed_result.reasoning,
        )

    def _build_output(self, results: list[TaggingResult]) -> LLMJobOutput:
        return LLMJobOutput(
            llm_job_type=TaskType.TAGGING,
            specific_task_result=TaggingLLMJobResult(
                llm_job_type=TaskType.TAGGING, results=results
            ),
        )
