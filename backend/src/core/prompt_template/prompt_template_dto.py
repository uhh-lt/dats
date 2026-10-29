from datetime import datetime
from typing import Annotated, ClassVar, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from common.meta_type_enum import MetaType
from core.prompt_template.prompt_template_enum import (
    DocumentUnit,
    OutputFormat,
    PromptBlock,
    PromptExampleKind,
    PromptLanguage,
    TaskType,
)
from repos.db.dto_base import UpdateDTOBase

# --- PROMPT SELECTIONS ---
# Snapshots of project data, so a version renders the same prompt forever.
# "Refresh" replaces them with the current state of the project.


class PromptCode(BaseModel):
    """A code selected in a prompt, as it was when the prompt was saved."""

    code_id: int = Field(description="ID of the code")
    name: str = Field(description="Name of the code", min_length=1)
    description: str = Field(description="Description of the code")


class PromptTag(BaseModel):
    """A tag selected in a prompt, as it was when the prompt was saved."""

    tag_id: int = Field(description="ID of the tag")
    name: str = Field(description="Name of the tag", min_length=1)
    description: str = Field(description="Description of the tag")


class PromptMetadataField(BaseModel):
    """A metadata field selected in a prompt, as it was when the prompt was saved."""

    project_metadata_id: int = Field(description="ID of the project metadata")
    key: str = Field(description="Key of the metadata field", min_length=1)
    description: str = Field(description="Description of the metadata field")
    metatype: MetaType = Field(description="Type of the metadata field")


class PromptSettings(BaseModel):
    """Settings of the document and output format blocks."""

    chunk_size_tokens: int = Field(
        description="Size of the chunks of <document:chunks> in tokens",
        default=650,
        gt=0,
    )
    chunk_overlap_tokens: int = Field(
        description="Overlap of consecutive chunks of <document:chunks> in tokens",
        default=100,
        ge=0,
    )
    context_before_chars: int = Field(
        description="Characters of context before a quote (<output-format:context>)",
        default=64,
        ge=0,
    )
    context_after_chars: int = Field(
        description="Characters of context after a quote (<output-format:context>)",
        default=64,
        ge=0,
    )
    fuzzy_threshold: float = Field(
        description=(
            "Minimum similarity (0-1) to locate a quote that is not found exactly "
            "(<output-format:context>)"
        ),
        default=0.85,
        ge=0,
        le=1,
    )

    @model_validator(mode="after")
    def check_chunk_overlap(self) -> Self:
        if self.chunk_overlap_tokens >= self.chunk_size_tokens:
            raise ValueError("The chunk overlap must be smaller than the chunk size")
        return self


# --- PROMPT EXAMPLES ---


class PromptExampleSpan(BaseModel):
    """An annotated span within the text of a span example."""

    code_id: int = Field(description="ID of the code of the span")
    begin: int = Field(description="Begin of the span within the text", ge=0)
    end: int = Field(description="End of the span within the text (exclusive)")


class PromptExampleBase(BaseModel):
    """A few-shot example: a snapshot of annotations, independent of later edits."""

    sdoc_id: int = Field(description="ID of the source document the text comes from")
    source_annotation_ids: list[int] = Field(
        description="IDs of the annotations the example was created from"
    )
    text: str = Field(description="The text of the example", min_length=1)


class SpanPromptExample(PromptExampleBase):
    """The sentences around selected span annotations with all spans of their annotator."""

    kind: Literal[PromptExampleKind.SPAN] = Field(
        description="The kind of annotation the example shows"
    )
    spans: list[PromptExampleSpan] = Field(
        description="All spans the annotator annotated in the text, sorted by begin"
    )

    @model_validator(mode="after")
    def check_spans_within_text(self) -> Self:
        for span in self.spans:
            if not span.begin < span.end <= len(self.text):
                raise ValueError("Every span must be a non-empty part of the text")
        return self


class SentencePromptExample(PromptExampleBase):
    """The sentences of a sentence annotation and its code."""

    kind: Literal[PromptExampleKind.SENTENCE] = Field(
        description="The kind of annotation the example shows"
    )
    code_id: int = Field(description="ID of the code of the sentences")


PromptExample = Annotated[
    SpanPromptExample | SentencePromptExample, Field(discriminator="kind")
]


class PromptExamplesCreate(BaseModel):
    """Selects annotations to turn into few-shot examples."""

    project_id: int = Field(description="Project the annotations belong to")
    kind: PromptExampleKind = Field(description="The kind of the annotations")
    annotation_ids: list[int] = Field(
        description="IDs of the span or sentence annotations", min_length=1
    )


# --- PROMPT TEMPLATE VERSION ---


class PromptTemplateContent(BaseModel):
    """The content of a prompt template version: the prompt and its selections."""

    prompt: str = Field(description="The prompt with its blocks")
    settings: PromptSettings = Field(
        description="Settings of the document and output format blocks",
        default_factory=PromptSettings,
    )
    codes: list[PromptCode] = Field(
        description="The codes of <codes> and <code_names>", default_factory=list
    )
    examples: list[PromptExample] = Field(
        description="The few-shot examples of <examples>", default_factory=list
    )
    tags: list[PromptTag] = Field(
        description="The tags of <tags>", default_factory=list
    )
    metadata_fields: list[PromptMetadataField] = Field(
        description="The metadata fields of <metadata_fields>", default_factory=list
    )


# Properties for creation
class PromptTemplateVersionCreate(PromptTemplateContent):
    pass


class PromptTemplateVersionCreateIntern(PromptTemplateContent):
    prompt_template_id: int = Field(
        description="ID of the prompt template the version belongs to"
    )
    version: int = Field(description="Number of the version within its template")
    user_id: int | None = Field(description="ID of the user who saved the version")


# Properties for reading (as in ORM)
class PromptTemplateVersionRead(PromptTemplateContent):
    id: int = Field(description="ID of the prompt template version")
    prompt_template_id: int = Field(
        description="ID of the prompt template the version belongs to"
    )
    version: int = Field(
        description="Number of the version within its template (1, 2, 3, ...)"
    )
    user_id: int | None = Field(description="ID of the user who saved the version")
    created: datetime = Field(description="Created timestamp of the version")
    model_config = ConfigDict(from_attributes=True)


# --- PROMPT TEMPLATE ---


# Properties shared across all DTOs
class PromptTemplateBaseDTO(BaseModel):
    name: str = Field(description="Name of the prompt template", min_length=1)
    task_type: TaskType = Field(description="The task the template is for")
    language: PromptLanguage = Field(
        description="The language of the template, it decides the text of the blocks"
    )


# Properties for creation
class PromptTemplateCreate(PromptTemplateBaseDTO, PromptTemplateContent):
    project_id: int = Field(description="Project the prompt template belongs to")


class PromptTemplateCreateIntern(PromptTemplateBaseDTO):
    project_id: int = Field(description="Project the prompt template belongs to")


# Properties for updating
class PromptTemplateUpdate(BaseModel, UpdateDTOBase):
    name: str | None = Field(
        description="Name of the prompt template", min_length=1, default=None
    )
    is_archived: bool | None = Field(
        description="Archived templates are no longer offered for new runs",
        default=None,
    )

    non_nullable_fields: ClassVar[frozenset[str]] = frozenset({"name", "is_archived"})


# Properties for reading (as in ORM)
class PromptTemplateRead(PromptTemplateBaseDTO):
    id: int = Field(description="ID of the prompt template")
    project_id: int = Field(description="Project the prompt template belongs to")
    is_archived: bool = Field(
        description="Archived templates are no longer offered for new runs"
    )
    created: datetime = Field(description="Created timestamp of the prompt template")
    updated: datetime = Field(description="Updated timestamp of the prompt template")
    versions: list[PromptTemplateVersionRead] = Field(
        description="All versions of the template, oldest first"
    )
    model_config = ConfigDict(from_attributes=True)


class PromptTemplateRefresh(PromptTemplateContent):
    """Content whose selections are replaced with the current state of the project."""

    project_id: int = Field(description="Project the selections belong to")


# --- RENDERING ---


class PromptTemplateSnapshot(PromptTemplateContent):
    """Everything needed to render a prompt: a stored version or an unsaved draft."""

    task_type: TaskType = Field(description="The task the prompt is for")
    language: PromptLanguage = Field(description="The language of the prompt")


class PromptPreviewRequest(BaseModel):
    """Renders a stored version or an unsaved draft for one message of a document."""

    project_id: int = Field(description="Project of the prompt and the document")
    prompt_template_version_id: int | None = Field(
        description=(
            "ID of the stored prompt template version to render. "
            "Exactly one of prompt_template_version_id and draft is set."
        ),
        default=None,
    )
    draft: PromptTemplateSnapshot | None = Field(
        description=(
            "An unsaved prompt to render. "
            "Exactly one of prompt_template_version_id and draft is set."
        ),
        default=None,
    )
    sdoc_id: int | None = Field(
        description=(
            "ID of the source document to render into <document:unit>; "
            "None keeps the block as it is"
        ),
        default=None,
    )
    message_index: int = Field(
        description="Index of the message (sentence or chunk) within the document",
        ge=0,
        default=0,
    )

    @model_validator(mode="after")
    def check_exactly_one_prompt_source(self) -> Self:
        if (self.prompt_template_version_id is None) == (self.draft is None):
            raise ValueError(
                "Exactly one of prompt_template_version_id and draft must be set"
            )
        return self


class RenderedPromptBlock(BaseModel):
    placeholder: str = Field(description="The block, e.g. <codes>")
    text: str = Field(description="The text the block is replaced with")


class PromptPreview(BaseModel):
    """The rendered prompt of one message of one document."""

    sdoc_id: int | None = Field(description="ID of the rendered source document")
    message_index: int = Field(
        description="Index of the rendered message (sentence or chunk) of the document"
    )
    num_messages: int = Field(
        description=(
            "Number of messages (LLM calls) the document is split into, "
            "0 without a document"
        )
    )
    prompt: str = Field(description="The rendered prompt")
    blocks: list[RenderedPromptBlock] = Field(
        description="The text of every block of the prompt except the document"
    )
    is_fewshot: bool = Field(
        description="The prompt shows few-shot examples, so a run is few-shot"
    )
    unknown_placeholders: list[str] = Field(
        description=(
            "Placeholder-like tags (e.g. <code>) that are sent to the LLM verbatim "
            "because no block fills them"
        )
    )


# --- BLOCK INFO ---


class DocumentUnitInfo(BaseModel):
    unit: DocumentUnit = Field(description="The document unit")
    placeholder: str = Field(description="The block, e.g. <document:whole>")
    description: str = Field(description="How the document is split")


class OutputFormatInfo(BaseModel):
    output_format: OutputFormat = Field(description="The output format")
    placeholder: str = Field(description="The block, e.g. <output-format:inline>")
    name: str = Field(description="Human-readable name of the format")
    description: str = Field(description="How the LLM answers in this format")
    details: str = Field(
        description="Markdown: how the format works, an example and when to use it"
    )
    default_document_unit: DocumentUnit = Field(
        description="The document unit the format works best with"
    )
    default_prompt_names: dict[PromptLanguage, str] = Field(
        description="Per language, the name of the format's default prompt that every project gets"
    )


class PromptBlockInfo(BaseModel):
    block: PromptBlock = Field(description="The selection block")
    description: str = Field(description="What the block is replaced with")


class PromptTaskInfo(BaseModel):
    """Describes the blocks a prompt of a task can use."""

    task_type: TaskType = Field(description="The task")
    document_units: list[DocumentUnitInfo] = Field(
        description="The document blocks; a prompt contains exactly one"
    )
    output_formats: list[OutputFormatInfo] = Field(
        description="The output format blocks; a prompt contains exactly one"
    )
    blocks: list[PromptBlockInfo] = Field(description="The selection blocks")
    required_blocks: list[PromptBlock] = Field(
        description="The prompt contains at least one of these blocks"
    )
    example_kind: PromptExampleKind | None = Field(
        description="The kind of few-shot examples, None if the task supports none"
    )
