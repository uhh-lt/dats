from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional, Union

from pydantic import BaseModel, Field

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.dto_base import UpdateDTOBase
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataReadResolved,
)


class LLMJobType(str, Enum):
    DOCUMENT_TAGGING = "DOCUMENT_TAGGING"
    METADATA_EXTRACTION = "METADATA_EXTRACTION"
    ANNOTATION = "ANNOTATION"


# Prompt template
class LLMPromptTemplates(BaseModel):
    language: str = Field(description="The language of the prompt template")
    system_prompt: str = Field(description="The system prompt to use for the job")
    user_prompt: str = Field(description="The user prompt to use for the job")


# --- START PARAMETERS ---


class SpecificLLMJobParameters(BaseModel):
    llm_job_type: LLMJobType = Field(description="The type of the LLMJob (what to llm)")


class DocumentBasedLLMJobParams(SpecificLLMJobParameters):
    sdoc_ids: List[int] = Field(description="IDs of the source documents to analyse")


class DocumentTaggingLLMJobParams(DocumentBasedLLMJobParams):
    llm_job_type: Literal[LLMJobType.DOCUMENT_TAGGING]
    tag_ids: List[int] = Field(
        description="IDs of the tags to use for the document tagging"
    )


class MetadataExtractionLLMJobParams(DocumentBasedLLMJobParams):
    llm_job_type: Literal[LLMJobType.METADATA_EXTRACTION]
    project_metadata_ids: List[int] = Field(
        description="IDs of the project metadata to use for the metadata extraction"
    )


class AnnotationLLMJobParams(DocumentBasedLLMJobParams):
    llm_job_type: Literal[LLMJobType.ANNOTATION]
    code_ids: List[int] = Field(
        description="IDs of the codes to use for the annotation"
    )


class LLMJobParameters(BaseModel):
    llm_job_type: LLMJobType = Field(description="The type of the LLMJob (what to llm)")
    project_id: int = Field(description="The ID of the Project to analyse")
    prompts: List[LLMPromptTemplates] = Field(
        description="The prompt templates to use for the job"
    )
    specific_llm_job_parameters: Union[
        DocumentTaggingLLMJobParams,
        MetadataExtractionLLMJobParams,
        AnnotationLLMJobParams,
    ] = Field(
        description="Specific parameters for the LLMJob w.r.t it's type",
        discriminator="llm_job_type",
    )


# --- END PARAMETERS ---

# --- START RESULTS ---


class DocumentTaggingResult(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    current_tag_ids: List[int] = Field(
        description="IDs of the tags currently assigned to the document"
    )
    suggested_tag_ids: List[int] = Field(
        description="IDs of the tags suggested by the LLM to assign to the document"
    )
    reasoning: str = Field(description="Reasoning for the tagging")


class DocumentTaggingLLMJobResult(BaseModel):
    llm_job_type: Literal[LLMJobType.DOCUMENT_TAGGING]
    results: List[DocumentTaggingResult]


class MetadataExtractionResult(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    current_metadata: List[SourceDocumentMetadataReadResolved] = Field(
        description="Current metadata"
    )
    suggested_metadata: List[SourceDocumentMetadataReadResolved] = Field(
        description="Suggested metadata"
    )


class MetadataExtractionLLMJobResult(BaseModel):
    llm_job_type: Literal[LLMJobType.METADATA_EXTRACTION]
    results: List[MetadataExtractionResult]


class AnnotationResult(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    data: str = Field(description="data")


class AnnotationLLMJobResult(BaseModel):
    llm_job_type: Literal[LLMJobType.ANNOTATION]
    results: List[AnnotationResult]


class LLMJobResult(BaseModel):
    llm_job_type: LLMJobType = Field(description="The type of the LLMJob (what to llm)")
    specific_llm_job_result: Union[
        DocumentTaggingLLMJobResult,
        MetadataExtractionLLMJobResult,
        AnnotationLLMJobResult,
    ] = Field(
        description="Specific result for the LLMJob w.r.t it's type",
        discriminator="llm_job_type",
    )


# --- END RESULTS ---


# Properties shared across all DTOs
class LLMJobBaseDTO(BaseModel):
    status: BackgroundJobStatus = Field(
        default=BackgroundJobStatus.WAITING, description="Status of the LLMJob"
    )
    num_steps_finished: int = Field(description="Number of steps LLMJob has completed.")
    num_steps_total: int = Field(description="Number of total steps.")
    result: Optional[LLMJobResult] = Field(
        default=None, description="Results of hte LLMJob."
    )


# Properties to create
class LLMJobCreate(LLMJobBaseDTO):
    parameters: LLMJobParameters = Field(
        description="The parameters of the LLMJob that defines what to do!"
    )


# Properties to update
class LLMJobUpdate(BaseModel, UpdateDTOBase):
    status: Optional[BackgroundJobStatus] = Field(
        default=None, description="Status of the LLMJob"
    )
    num_steps_finished: Optional[int] = Field(
        default=None, description="Number of steps LLMJob has completed."
    )
    result: Optional[LLMJobResult] = Field(
        default=None, description="Result of the LLMJob."
    )


# Properties to read
class LLMJobRead(LLMJobBaseDTO):
    id: str = Field(description="ID of the LLMJob")
    parameters: LLMJobParameters = Field(
        description="The parameters of the LLMJob that defines what to llm!"
    )
    created: datetime = Field(description="Created timestamp of the LLMJob")
    updated: datetime = Field(description="Updated timestamp of the LLMJob")
