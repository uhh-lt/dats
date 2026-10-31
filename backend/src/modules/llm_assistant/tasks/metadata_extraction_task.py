from loguru import logger
from pydantic import BaseModel

from core.doc.source_document_crud import crud_sdoc
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataReadResolved,
)
from core.prompt.prompt_enum import TaskType
from modules.llm_assistant.llm_assistant_job_dto import (
    MetadataExtractionLLMAssistantJobResult,
    MetadataExtractionResult,
)
from modules.llm_assistant.strategies.metadata_strategy import MetadataStrategy
from modules.llm_assistant.tasks.llm_assistant_document_processor import (
    LLMAssistantDocumentResponse,
)
from modules.llm_assistant.tasks.llm_assistant_task import (
    LLMAssistantTask,
    LLMAssistantTaskContext,
)


class MetadataExtractionTask(
    LLMAssistantTask[MetadataStrategy, BaseModel, MetadataExtractionResult]
):
    """Extract structured metadata suggestions from source documents."""

    task_name = "Metadata Extraction"
    task_type = TaskType.METADATA_EXTRACTION

    def _get_response_model(self, strategy: MetadataStrategy) -> type[BaseModel]:
        return strategy.get_response_model()

    def _process_document(
        self,
        *,
        context: LLMAssistantTaskContext[MetadataStrategy],
        document: LLMAssistantDocumentResponse[BaseModel],
    ) -> MetadataExtractionResult:
        project_metadata_ids = [
            field.project_metadata_id
            for field in context.strategy.prompt.metadata_fields
        ]
        current_metadata = [
            SourceDocumentMetadataReadResolved.model_validate(metadata)
            for metadata in crud_sdoc.read(
                db=context.db, id=document.sdoc_data.id
            ).metadata_
            if metadata.project_metadata_id in project_metadata_ids
        ]
        logger.info(
            "Document {} has existing values for {} of {} selected metadata field(s).",
            document.sdoc_data.id,
            len(current_metadata),
            len(project_metadata_ids),
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
        for project_metadata_id in project_metadata_ids:
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
            len(project_metadata_ids),
        )
        return MetadataExtractionResult(
            status="finished",
            status_message="Metadata extraction successful",
            sdoc_id=document.sdoc_data.id,
            current_metadata=current_metadata,
            suggested_metadata=suggested_metadata,
        )

    def _build_result(
        self, results: list[MetadataExtractionResult]
    ) -> MetadataExtractionLLMAssistantJobResult:
        return MetadataExtractionLLMAssistantJobResult(
            task_type=TaskType.METADATA_EXTRACTION, results=results
        )
