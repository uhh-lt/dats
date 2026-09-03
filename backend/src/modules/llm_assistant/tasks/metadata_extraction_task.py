from loguru import logger
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.doc.source_document_crud import crud_sdoc
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataReadResolved,
)
from modules.llm_assistant.llm_job_dto import (
    ApproachRecommendation,
    ApproachType,
    LLMJobOutput,
    MetadataExtractionLLMJobResult,
    MetadataExtractionParams,
    MetadataExtractionResult,
    SpecificTaskParameters,
    TaskType,
)
from modules.llm_assistant.strategies.metadata_strategy import MetadataStrategy
from modules.llm_assistant.tasks.llm_document_processor import LLMDocumentResponse
from modules.llm_assistant.tasks.llm_task import LLMTask, LLMTaskContext


class MetadataExtractionTask(
    LLMTask[
        MetadataStrategy,
        MetadataExtractionParams,
        BaseModel,
        MetadataExtractionResult,
    ]
):
    """Extract structured metadata suggestions from source documents."""

    task_name = "Metadata Extraction"

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
            reasoning="Only zero-shot approach is available for metadata extraction (yet).",
        )

    def _get_response_model(self, strategy: MetadataStrategy) -> type[BaseModel]:
        return strategy.get_response_model()

    def _process_document(
        self,
        *,
        context: LLMTaskContext[MetadataStrategy, MetadataExtractionParams],
        document: LLMDocumentResponse[BaseModel],
    ) -> MetadataExtractionResult:
        current_metadata = [
            SourceDocumentMetadataReadResolved.model_validate(metadata)
            for metadata in crud_sdoc.read(
                db=context.db, id=document.sdoc_data.id
            ).metadata_
            if metadata.project_metadata_id
            in context.task_parameters.project_metadata_ids
        ]
        logger.info(
            "Document {} has existing values for {} of {} selected metadata field(s).",
            document.sdoc_data.id,
            len(current_metadata),
            len(context.task_parameters.project_metadata_ids),
        )
        if len(document.responses) != 1:
            return MetadataExtractionResult(
                status="error",
                status_message="Expected exactly one LLM response for metadata extraction",
                sdoc_id=document.sdoc_data.id,
                current_metadata=current_metadata,
                suggested_metadata=[],
            )

        response = document.responses[0].response
        if response.is_error or response.parsed is None:
            return MetadataExtractionResult(
                status="error",
                status_message=response.error or "Unknown LLM error",
                sdoc_id=document.sdoc_data.id,
                current_metadata=current_metadata,
                suggested_metadata=[],
            )

        parsed_response = context.strategy.parse_result(result=response.parsed)
        current_metadata_dict = {
            metadata.project_metadata.id: metadata for metadata in current_metadata
        }
        suggested_metadata: list[SourceDocumentMetadataReadResolved] = []
        for project_metadata_id in context.task_parameters.project_metadata_ids:
            current = current_metadata_dict.get(project_metadata_id)
            suggestion = parsed_response.get(project_metadata_id)
            if current is None or suggestion is None:
                continue

            suggested_metadata.append(
                SourceDocumentMetadataReadResolved.with_value(
                    sdoc_metadata_id=current.id,
                    source_document_id=current.source_document_id,
                    project_metadata=current.project_metadata,
                    value=suggestion,
                )
            )

        logger.info(
            "Document {} produced suggestions for {} of {} selected metadata field(s).",
            document.sdoc_data.id,
            len(suggested_metadata),
            len(context.task_parameters.project_metadata_ids),
        )
        return MetadataExtractionResult(
            status="finished",
            status_message="Metadata extraction successful",
            sdoc_id=document.sdoc_data.id,
            current_metadata=current_metadata,
            suggested_metadata=suggested_metadata,
        )

    def _build_output(self, results: list[MetadataExtractionResult]) -> LLMJobOutput:
        return LLMJobOutput(
            llm_job_type=TaskType.METADATA_EXTRACTION,
            specific_task_result=MetadataExtractionLLMJobResult(
                llm_job_type=TaskType.METADATA_EXTRACTION, results=results
            ),
        )
