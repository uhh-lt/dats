from typing import Annotated, Literal

import pandas as pd
from pydantic import BaseModel, Field, field_validator

from core.prompt.prompt_dto import PromptSettings
from core.prompt.prompt_enum import (
    PromptExampleKind,
    PromptLanguage,
    TaskType,
)

# --- SELECTIONS ---
# The selections of a version reference project data by id. Ids differ between
# projects, so the export references codes and tags by name, metadata fields by key
# and doctype, documents by filename and annotations by uuid. A reference is None if
# the referenced object was deleted. The snapshot fields (name, description, ...)
# are exported as they are.


class PromptCodeForExport(BaseModel):
    code_name: str | None = Field(description="Name of the selected code")
    name: str = Field(description="Name of the code when the prompt was saved")
    description: str = Field(description="Description of the code when saved")


class PromptTagForExport(BaseModel):
    tag_name: str | None = Field(description="Name of the selected tag")
    name: str = Field(description="Name of the tag when the prompt was saved")
    description: str = Field(description="Description of the tag when saved")


class PromptMetadataFieldForExport(BaseModel):
    metadata_key: str | None = Field(description="Key of the selected metadata field")
    metadata_doctype: str | None = Field(
        description="Doctype of the selected metadata field"
    )
    key: str = Field(description="Key of the metadata field when the prompt was saved")
    description: str = Field(description="Description of the field when saved")
    metatype: str = Field(description="Type of the metadata field when saved")


class PromptExampleSpanForExport(BaseModel):
    code_name: str | None = Field(description="Name of the code of the span")
    begin: int = Field(description="Begin of the span within the text")
    end: int = Field(description="End of the span within the text (exclusive)")


class PromptExampleForExportBase(BaseModel):
    sdoc_filename: str | None = Field(
        description="Filename of the source document the text comes from"
    )
    source_annotation_uuids: list[str] = Field(
        description="UUIDs of the annotations the example was created from"
    )
    text: str = Field(description="The text of the example")


class SpanPromptExampleForExport(PromptExampleForExportBase):
    kind: Literal[PromptExampleKind.SPAN] = Field(
        description="The kind of annotation the example shows"
    )
    spans: list[PromptExampleSpanForExport] = Field(
        description="All spans the annotator annotated in the text"
    )


class SentencePromptExampleForExport(PromptExampleForExportBase):
    kind: Literal[PromptExampleKind.SENTENCE] = Field(
        description="The kind of annotation the example shows"
    )
    code_name: str | None = Field(description="Name of the code of the sentences")


PromptExampleForExport = Annotated[
    SpanPromptExampleForExport | SentencePromptExampleForExport,
    Field(discriminator="kind"),
]


class PromptSelectionsForExport(BaseModel):
    """The selections of a prompt version."""

    codes: list[PromptCodeForExport] = Field(description="The selected codes")
    examples: list[PromptExampleForExport] = Field(description="The few-shot examples")
    tags: list[PromptTagForExport] = Field(description="The selected tags")
    metadata_fields: list[PromptMetadataFieldForExport] = Field(
        description="The selected metadata fields"
    )


# --- VERSIONS ---


class PromptExportSchema(BaseModel):
    """Schema definition for prompt export/import operations: one row per
    version of a prompt, with the prompt's fields repeated in every row."""

    prompt_name: str = Field(description="Name of the prompt")
    task_type: TaskType = Field(description="The task the prompt is for")
    language: PromptLanguage = Field(description="The language of the prompt")
    is_archived: bool = Field(description="Whether the prompt is archived")
    version: int = Field(description="Number of the version within its prompt")
    text: str = Field(description="The text of the prompt with its blocks")
    settings: str = Field(description="JSON string of the version's PromptSettings")
    selections: str = Field(
        description="JSON string of the version's PromptSelectionsForExport"
    )
    user_email: str | None = Field(
        description="Email of the user who saved the version", default=None
    )

    @field_validator("prompt_name")
    @classmethod
    def validate_prompt_name(cls, v: str) -> str:
        if v.strip() == "":
            raise ValueError("prompt_name cannot be empty")
        return v

    @field_validator("text", mode="before")
    @classmethod
    def validate_text(cls, v: str | None) -> str:
        # an empty text is exported as an empty cell
        return v or ""

    @field_validator("settings")
    @classmethod
    def validate_settings_json(cls, v: str) -> str:
        PromptSettings.model_validate_json(v)
        return v

    @field_validator("selections")
    @classmethod
    def validate_selections_json(cls, v: str) -> str:
        PromptSelectionsForExport.model_validate_json(v)
        return v


class PromptExportCollection(BaseModel):
    """Collection of prompt versions for export/import operations."""

    versions: list[PromptExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "PromptExportCollection":
        """Convert a DataFrame to a PromptExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.replace({pd.NA: None, float("nan"): None})
        records = df_cleaned.to_dict("records")
        versions = [PromptExportSchema(**record) for record in records]  # type: ignore
        return cls(versions=versions)

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the PromptExportCollection to a DataFrame."""
        records = [version.model_dump(mode="json") for version in self.versions]
        return pd.DataFrame(records)
