from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field

from core.annotation.sentence_annotation_dto import SentenceAnnotationRead
from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataReadResolved,
)
from systems.job_system.job_dto import JobInputBase, JobOutputBase

# --- START INPUT ---


class TaskType(str, Enum):
    TAGGING = "TAGGING"
    METADATA_EXTRACTION = "METADATA_EXTRACTION"
    ANNOTATION = "ANNOTATION"
    SENTENCE_ANNOTATION = "SENTENCE_ANNOTATION"


class SpecificTaskParameters(BaseModel):
    llm_job_type: TaskType = Field(description="The type of the LLMJob (what to llm)")


class DocumentBasedTaskParams(SpecificTaskParameters):
    sdoc_ids: list[int] = Field(description="IDs of the source documents to analyse")


class TaggingParams(DocumentBasedTaskParams):
    llm_job_type: Literal[TaskType.TAGGING]
    tag_ids: list[int] = Field(
        description="IDs of the tags to use for the document tagging"
    )


class MetadataExtractionParams(DocumentBasedTaskParams):
    llm_job_type: Literal[TaskType.METADATA_EXTRACTION]
    project_metadata_ids: list[int] = Field(
        description="IDs of the project metadata to use for the metadata extraction"
    )


class AnnotationParams(DocumentBasedTaskParams):
    llm_job_type: Literal[TaskType.ANNOTATION]
    code_ids: list[int] = Field(
        description="IDs of the codes to use for the annotation"
    )


class SentenceAnnotationParams(DocumentBasedTaskParams):
    llm_job_type: Literal[TaskType.SENTENCE_ANNOTATION]
    code_ids: list[int] = Field(
        description="IDs of the codes to use for the sentence annotation"
    )
    delete_existing_annotations: bool = Field(
        description="Delete existing annotations before creating new ones", default=True
    )


class LLMJobParameters(JobInputBase):
    llm_job_type: TaskType = Field(description="The type of the LLMJob (what to llm)")
    specific_task_parameters: (
        TaggingParams
        | MetadataExtractionParams
        | AnnotationParams
        | SentenceAnnotationParams
    ) = Field(
        description="Specific parameters for the LLMJob w.r.t it's type",
        discriminator="llm_job_type",
    )


# --- END TASK PARAMETERS ---

# --- START APPROACH PARAMETERS ---


class ApproachType(str, Enum):
    LLM_ZERO_SHOT = "LLM_ZERO_SHOT"
    LLM_FEW_SHOT = "LLM_FEW_SHOT"
    MODEL_TRAINING = "MODEL_TRAINING"


# Prompt template
class LLMPromptTemplates(BaseModel):
    language: str = Field(description="The language of the prompt template")
    system_prompt: str = Field(description="The system prompt to use for the job")
    user_prompt: str = Field(description="The user prompt to use for the job")


class SpecificApproachParameters(BaseModel):
    llm_approach_type: ApproachType = Field(
        description="The type of the LLMJob (what to llm)"
    )


class ZeroShotParams(SpecificApproachParameters):
    llm_approach_type: Literal[ApproachType.LLM_ZERO_SHOT]
    prompts: list[LLMPromptTemplates] = Field(
        description="The prompt templates to use for the job"
    )


class FewShotParams(SpecificApproachParameters):
    llm_approach_type: Literal[ApproachType.LLM_FEW_SHOT]
    prompts: list[LLMPromptTemplates] = Field(
        description="The prompt templates to use for the job"
    )


# Training Parameters (used for training the SequenceTaggingModel)
class TrainingParameters(BaseModel):
    max_epochs: int = Field(
        description="The maximum number of epochs to train the model"
    )
    batch_size: int = Field(description="The batch size to use for training")
    learning_rate: float = Field(description="The learning rate to use for training")


class ModelTrainingParams(SpecificApproachParameters):
    llm_approach_type: Literal[ApproachType.MODEL_TRAINING]
    training_parameters: TrainingParameters = Field(
        description="The training parameters to use for the job"
    )


class LLMJobInput(LLMJobParameters):
    llm_approach_type: ApproachType = Field(
        description="The approach to use for the LLMJob"
    )
    specific_approach_parameters: (
        ZeroShotParams | FewShotParams | ModelTrainingParams
    ) = Field(
        description="Specific parameters for the approach w.r.t it's type",
        discriminator="llm_approach_type",
    )


# --- END INPUT ---

# --- START OUTPUT ---


class LLMResultWithStatus(BaseModel):
    status: Literal["error", "finished"] = Field(
        description="Status of the Result",
    )
    status_message: str = Field(description="Status message of the result")


class TaggingResult(LLMResultWithStatus):
    sdoc_id: int = Field(description="ID of the source document")
    current_tag_ids: list[int] = Field(
        description="IDs of the tags currently assigned to the document"
    )
    suggested_tag_ids: list[int] = Field(
        description="IDs of the tags suggested by the LLM to assign to the document"
    )
    reasoning: str = Field(description="Reasoning for the tagging")


class TaggingLLMJobResult(BaseModel):
    llm_job_type: Literal[TaskType.TAGGING]
    results: list[TaggingResult]


class MetadataExtractionResult(LLMResultWithStatus):
    sdoc_id: int = Field(description="ID of the source document")
    current_metadata: list[SourceDocumentMetadataReadResolved] = Field(
        description="Current metadata"
    )
    suggested_metadata: list[SourceDocumentMetadataReadResolved] = Field(
        description="Suggested metadata"
    )


class MetadataExtractionLLMJobResult(BaseModel):
    llm_job_type: Literal[TaskType.METADATA_EXTRACTION]
    results: list[MetadataExtractionResult]


class AnnotationResult(LLMResultWithStatus):
    sdoc_id: int = Field(description="ID of the source document")
    suggested_annotations: list[SpanAnnotationRead] = Field(
        description="Suggested annotations"
    )


class AnnotationLLMJobResult(BaseModel):
    llm_job_type: Literal[TaskType.ANNOTATION]
    results: list[AnnotationResult]


class SentenceAnnotationResult(LLMResultWithStatus):
    sdoc_id: int = Field(description="ID of the source document")
    suggested_annotations: list[SentenceAnnotationRead] = Field(
        description="Suggested annotations"
    )


class SentenceAnnotationLLMJobResult(BaseModel):
    llm_job_type: Literal[TaskType.SENTENCE_ANNOTATION]
    results: list[SentenceAnnotationResult]


class LLMJobOutput(JobOutputBase):
    llm_job_type: TaskType = Field(description="The type of the LLMJob (what to llm)")
    specific_task_result: (
        TaggingLLMJobResult
        | MetadataExtractionLLMJobResult
        | AnnotationLLMJobResult
        | SentenceAnnotationLLMJobResult
    ) = Field(
        description="Specific result for the LLMJob w.r.t it's type",
        discriminator="llm_job_type",
    )


# --- END OUTPUT ---


# --- START OTHER DTOs ---


class ApproachRecommendation(BaseModel):
    recommended_approach: ApproachType = Field(description="Recommended approach")
    reasoning: str = Field(description="Reasoning for the recommendation")
    available_approaches: dict[ApproachType, bool] = Field(
        description="Available approaches"
    )


# --- END OTHER DTOs ---
