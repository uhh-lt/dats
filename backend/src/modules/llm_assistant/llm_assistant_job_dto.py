from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator

from core.annotation.sentence_annotation_dto import SentenceAnnotationRead
from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataReadResolved,
)
from core.prompt_template.prompt_template_dto import PromptTemplateSnapshot
from core.prompt_template.prompt_template_enum import TaskType
from modules.llm_assistant.llm_assistant_enum import ApproachType
from systems.job_system.job_dto import JobInputBase, JobOutputBase

# --- START INPUT ---

# The tasks that write annotations, always into a virtual user
ANNOTATING_TASK_TYPES = frozenset({TaskType.ANNOTATION, TaskType.SENTENCE_ANNOTATION})


class LLMAssistantJobInput(JobInputBase):
    """Runs a prompt on documents: a stored prompt template version or a draft.

    The prompt decides everything but the documents and the model: the task, the
    selected codes, tags or metadata fields, the examples (few-shot if it shows
    any), how documents are split and the answer format.
    """

    task_type: TaskType = Field(description="The task of the prompt")
    sdoc_ids: list[int] = Field(description="IDs of the source documents to process")
    model: str = Field(description="Large Language Model to use for the job")
    prompt_template_version_id: int | None = Field(
        description=(
            "ID of the prompt template version to run. "
            "Exactly one of prompt_template_version_id and draft is set."
        ),
        default=None,
    )
    draft: PromptTemplateSnapshot | None = Field(
        description=(
            "An unsaved prompt to run, e.g. the prompt of the wizard. "
            "Exactly one of prompt_template_version_id and draft is set."
        ),
        default=None,
    )
    virtual_user_id: int | None = Field(
        description=(
            "Virtual user of the project the annotations are written into. "
            "Required for span and sentence annotation, unused otherwise."
        ),
        default=None,
    )
    delete_existing_annotations: bool = Field(
        description=(
            "Delete the existing annotations of the virtual user for the "
            "documents and codes of the prompt before creating new ones"
        ),
        default=False,
    )

    @model_validator(mode="after")
    def check_prompt_source(self) -> Self:
        if (self.prompt_template_version_id is None) == (self.draft is None):
            raise ValueError(
                "Exactly one of prompt_template_version_id and draft must be set"
            )
        if self.draft is not None and self.draft.task_type != self.task_type:
            raise ValueError("The draft must be a prompt of the job's task")
        if self.task_type in ANNOTATING_TASK_TYPES and self.virtual_user_id is None:
            raise ValueError(
                "Annotation tasks need the virtual user to annotate as "
                "(virtual_user_id)"
            )
        return self


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
    approach_type: ApproachType = Field(
        description="Few-shot if the prompt showed examples, zero-shot otherwise"
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
