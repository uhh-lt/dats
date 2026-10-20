from enum import Enum
from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator

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
    task_type: TaskType = Field(
        description="The type of the LLMAssistantJob (what to llm)"
    )


class DocumentBasedTaskParams(SpecificTaskParameters):
    sdoc_ids: list[int] = Field(description="IDs of the source documents to analyse")


class TaggingParams(DocumentBasedTaskParams):
    task_type: Literal[TaskType.TAGGING] = Field(
        description="The type of the LLM Assistant task"
    )
    tag_ids: list[int] = Field(
        description="IDs of the tags to use for the document tagging"
    )


class MetadataExtractionParams(DocumentBasedTaskParams):
    task_type: Literal[TaskType.METADATA_EXTRACTION] = Field(
        description="The type of the LLM Assistant task"
    )
    project_metadata_ids: list[int] = Field(
        description="IDs of the project metadata to use for the metadata extraction"
    )


class AnnotationParams(DocumentBasedTaskParams):
    task_type: Literal[TaskType.ANNOTATION] = Field(
        description="The type of the LLM Assistant task"
    )
    code_ids: list[int] = Field(
        description="IDs of the codes to use for the annotation"
    )
    delete_existing_annotations: bool = Field(
        description="Delete existing annotations before creating new ones",
        default=False,
    )


class SentenceAnnotationParams(DocumentBasedTaskParams):
    task_type: Literal[TaskType.SENTENCE_ANNOTATION] = Field(
        description="The type of the LLM Assistant task"
    )
    code_ids: list[int] = Field(
        description="IDs of the codes to use for the sentence annotation"
    )
    delete_existing_annotations: bool = Field(
        description="Delete existing annotations before creating new ones",
        default=False,
    )


class LLMAssistantJobParameters(JobInputBase):
    task_type: TaskType = Field(
        description="The type of the LLMAssistantJob (what to llm)"
    )
    specific_task_parameters: (
        TaggingParams
        | MetadataExtractionParams
        | AnnotationParams
        | SentenceAnnotationParams
    ) = Field(
        description="Specific parameters for the LLMAssistantJob w.r.t it's type",
        discriminator="task_type",
    )


# --- END TASK PARAMETERS ---

# --- START APPROACH PARAMETERS ---


class ApproachType(str, Enum):
    LLM_ZERO_SHOT = "LLM_ZERO_SHOT"
    LLM_FEW_SHOT = "LLM_FEW_SHOT"


# Prompt template
class LLMAssistantPromptTemplates(BaseModel):
    language: str = Field(description="The language of the prompt template")
    system_prompt: str = Field(description="The system prompt to use for the job")
    user_prompt: str = Field(description="The user prompt to use for the job")


class SpecificApproachParameters(BaseModel):
    approach_type: ApproachType = Field(
        description="The type of the LLMAssistantJob (what to llm)"
    )


class ZeroShotParams(SpecificApproachParameters):
    approach_type: Literal[ApproachType.LLM_ZERO_SHOT] = Field(
        description="The approach of the LLM Assistant job"
    )
    prompts: list[LLMAssistantPromptTemplates] = Field(
        description="The prompt templates to use for the job"
    )
    model: str = Field(description="Large Language Model to use for the job")


class FewShotParams(SpecificApproachParameters):
    approach_type: Literal[ApproachType.LLM_FEW_SHOT] = Field(
        description="The approach of the LLM Assistant job"
    )
    prompts: list[LLMAssistantPromptTemplates] = Field(
        description="The prompt templates to use for the job"
    )
    model: str = Field(description="Large Language Model to use for the job")


# --- END APPROACH PARAMETERS ---

# --- START STRATEGY PARAMETERS ---


class StrategyType(str, Enum):
    TAGGING_DEFAULT = "TAGGING_DEFAULT"
    METADATA_DEFAULT = "METADATA_DEFAULT"
    SENTENCE_ANNOTATION_DEFAULT = "SENTENCE_ANNOTATION_DEFAULT"
    NER_INLINE_TAGS = "NER_INLINE_TAGS"
    CONTEXT_ANCHORED_FUZZY_MATCHING = "CONTEXT_ANCHORED_FUZZY_MATCHING"


class SpecificStrategyParameters(BaseModel):
    strategy_type: StrategyType = Field(
        description="The type of the strategy (how to llm)"
    )


class DefaultStrategyParams(SpecificStrategyParameters):
    """Params for single-strategy tasks (tagging, metadata, sentence annotation)."""

    strategy_type: Literal[
        StrategyType.TAGGING_DEFAULT,
        StrategyType.METADATA_DEFAULT,
        StrategyType.SENTENCE_ANNOTATION_DEFAULT,
    ] = Field(description="The strategy to ground the LLM output in the document")


class NERInlineTagStrategyParams(SpecificStrategyParameters):
    strategy_type: Literal[StrategyType.NER_INLINE_TAGS] = Field(
        description="The strategy to ground the LLM output in the document"
    )


class FuzzyGroundingStrategyParams(SpecificStrategyParameters):
    strategy_type: Literal[StrategyType.CONTEXT_ANCHORED_FUZZY_MATCHING] = Field(
        description="The strategy to ground the LLM output in the document"
    )
    fuzzy_threshold: float = Field(
        default=0.85,
        ge=0,
        le=1,
        description="Minimum similarity ratio (0-1) for fuzzy grounding of extracted quotes",
    )
    context_before_chars: int = Field(
        default=64,
        ge=0,
        description="Number of context characters the LLM should provide before the quote",
    )
    context_after_chars: int = Field(
        default=64,
        ge=0,
        description="Number of context characters the LLM should provide after the quote",
    )
    chunk_size_tokens: int = Field(
        default=650,
        gt=0,
        description="Size of document chunks (in tokens) sent to the LLM",
    )
    chunk_overlap_tokens: int = Field(
        default=100,
        ge=0,
        description="Overlap (in tokens) between consecutive chunks",
    )

    @model_validator(mode="after")
    def validate_chunk_overlap(self) -> Self:
        if self.chunk_overlap_tokens >= self.chunk_size_tokens:
            raise ValueError("Chunk overlap must be smaller than chunk size")
        return self


class LLMAssistantJobInput(LLMAssistantJobParameters):
    approach_type: ApproachType = Field(
        description="The approach to use for the LLMAssistantJob"
    )
    specific_approach_parameters: ZeroShotParams | FewShotParams = Field(
        description="Specific parameters for the approach w.r.t it's type",
        discriminator="approach_type",
    )
    strategy_type: StrategyType = Field(
        description="The strategy to use for the LLMAssistantJob"
    )
    specific_strategy_parameters: (
        DefaultStrategyParams
        | NERInlineTagStrategyParams
        | FuzzyGroundingStrategyParams
    ) = Field(
        description="Specific parameters for the strategy w.r.t it's type",
        discriminator="strategy_type",
    )


# --- END STRATEGY PARAMETERS ---

# --- END INPUT ---

# --- START OUTPUT ---


class LLMAssistantResultWithStatus(BaseModel):
    status: Literal["error", "finished", "partial"] = Field(
        description="Status of the Result",
    )
    status_message: str = Field(description="Status message of the result")


class TaggingResult(LLMAssistantResultWithStatus):
    sdoc_id: int = Field(description="ID of the source document")
    current_tag_ids: list[int] = Field(
        description="IDs of the tags currently assigned to the document"
    )
    suggested_tag_ids: list[int] = Field(
        description="IDs of the tags suggested by the LLM to assign to the document"
    )
    reasoning: str = Field(description="Reasoning for the tagging")


class TaggingLLMAssistantJobResult(BaseModel):
    task_type: Literal[TaskType.TAGGING] = Field(
        description="The type of the LLM Assistant task"
    )
    results: list[TaggingResult] = Field(
        description="The tagging results, one per document"
    )


class MetadataExtractionResult(LLMAssistantResultWithStatus):
    sdoc_id: int = Field(description="ID of the source document")
    current_metadata: list[SourceDocumentMetadataReadResolved] = Field(
        description="Current metadata"
    )
    suggested_metadata: list[SourceDocumentMetadataReadResolved] = Field(
        description="Suggested metadata"
    )


class MetadataExtractionLLMAssistantJobResult(BaseModel):
    task_type: Literal[TaskType.METADATA_EXTRACTION] = Field(
        description="The type of the LLM Assistant task"
    )
    results: list[MetadataExtractionResult] = Field(
        description="The metadata extraction results, one per document"
    )


class AnnotationResult(LLMAssistantResultWithStatus):
    sdoc_id: int = Field(description="ID of the source document")
    suggested_annotations: list[SpanAnnotationRead] = Field(
        description="Suggested annotations"
    )
    raw_response: str | None = Field(
        description="Raw LLM response (only set if no annotations were suggested or an error occurred)",
        default=None,
    )


class AnnotationLLMAssistantJobResult(BaseModel):
    task_type: Literal[TaskType.ANNOTATION] = Field(
        description="The type of the LLM Assistant task"
    )
    results: list[AnnotationResult] = Field(
        description="The annotation results, one per document"
    )


class SentenceAnnotationResult(LLMAssistantResultWithStatus):
    sdoc_id: int = Field(description="ID of the source document")
    suggested_annotations: list[SentenceAnnotationRead] = Field(
        description="Suggested annotations"
    )
    raw_response: str | None = Field(
        description="Raw LLM response (only set if no annotations were suggested or an error occurred)",
        default=None,
    )


class SentenceAnnotationLLMAssistantJobResult(BaseModel):
    task_type: Literal[TaskType.SENTENCE_ANNOTATION] = Field(
        description="The type of the LLM Assistant task"
    )
    results: list[SentenceAnnotationResult] = Field(
        description="The sentence annotation results, one per document"
    )


class LLMAssistantJobOutput(JobOutputBase):
    task_type: TaskType = Field(
        description="The type of the LLMAssistantJob (what to llm)"
    )
    specific_task_result: (
        TaggingLLMAssistantJobResult
        | MetadataExtractionLLMAssistantJobResult
        | AnnotationLLMAssistantJobResult
        | SentenceAnnotationLLMAssistantJobResult
    ) = Field(
        description="Specific result for the LLMAssistantJob w.r.t it's type",
        discriminator="task_type",
    )


# --- END OUTPUT ---


# --- START OTHER DTOs ---


class ApproachRecommendation(BaseModel):
    recommended_approach: ApproachType = Field(description="Recommended approach")
    reasoning: str = Field(description="Reasoning for the recommendation")
    available_approaches: dict[ApproachType, bool] = Field(
        description="Available approaches"
    )


class StrategyInfo(BaseModel):
    """Describes an available strategy for a task, for display in the frontend."""

    strategy_type: StrategyType = Field(description="The strategy type")
    name: str = Field(description="Human-readable name of the strategy")
    description: str = Field(description="Explanation of what the strategy does")
    default_params: (
        DefaultStrategyParams
        | NERInlineTagStrategyParams
        | FuzzyGroundingStrategyParams
    ) = Field(description="Default strategy parameters")
    allowed_data_tags: list[str] = Field(
        description="Data tags (document content placeholders) this strategy supports"
    )


# --- END OTHER DTOs ---
