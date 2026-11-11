import ast

import pandas as pd
from pydantic import (
    BaseModel,
    Field,
    ValidationInfo,
    field_validator,
    model_validator,
)

from common.doc_type_enum import DocType
from common.sdoc_status_enum import SDocStatus
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry


class SourceDocumentExportSchema(BaseModel):
    """Schema definition for source document info export/import operations."""

    # Info about the source document itself
    filename: str = Field(description="Filename of the source document")
    name: str = Field(description="Name of the source document (default is filename)")
    doctype: str = Field(description="Document type of the source document")
    status: int = Field(description="Status of the source document")
    step_status: dict[str, int | None] = Field(
        description="Status of each pipeline step of the doctype, null = not planned"
    )

    # Info about the folder that contains the source document
    folder_name: str = Field(
        description="Name of the sdoc folder that contains the source document"
    )
    folder_parent_name: str | None = Field(
        description="Name of the normal folder that contains the sdoc folder (if any)"
    )

    # Data attached to the source document
    tags: list[str] = Field(
        description="List of tags (tag names) associated with the source document"
    )
    word_frequencies: list[tuple[str, int]] = Field(
        description="List of word frequencies (word, frequency) associated with the source document"
    )
    metadata: list[tuple[str, (str | int | bool | list)]] = Field(
        description="List of metadata (key, value) associated with the source document"
    )

    # Processed data of the source document
    content: str | None = Field(description="Content of the source document")
    html: str = Field(description="HTML representation of the source document")
    raw_html: str = Field(description="Raw HTML representation of the source document")
    token_starts: list[int] = Field(
        description="List of start positions of tokens in the source document"
    )
    token_ends: list[int] = Field(
        description="List of end positions of tokens in the source document"
    )
    sentence_starts: list[int] = Field(
        description="List of start positions of sentences in the source document"
    )
    sentence_ends: list[int] = Field(
        description="List of end positions of sentences in the source document"
    )
    token_time_starts: list[int] | None = Field(
        description="List of start times of tokens in the source document. (Only for audio/video files)",
        default=None,
    )
    token_time_ends: list[int] | None = Field(
        description="List of end times of tokens in the source document. (Only for audio/video files)",
        default=None,
    )

    # Embeddings of the source document
    document_embedding: list[float] | None = Field(
        description="Document embedding of the source document",
        default=None,
    )
    image_embedding: list[float] | None = Field(
        description="Image embedding of the source document (Only for image files)",
        default=None,
    )
    sentence_embeddings: list[list[float]] = Field(
        description="List of sentence embeddings of the source document"
    )

    @field_validator("filename", "doctype", "folder_name")
    @classmethod
    def validate_required_fields(cls, v, info):
        if not v or v.strip() == "":
            raise ValueError(f"{info.field_name} cannot be empty")
        return v

    @field_validator("html", "raw_html", mode="before")
    @classmethod
    def read_missing_html_as_empty(cls, v):
        """An empty HTML (e.g. of an image without caption) is an empty CSV cell,
        which pandas reads as a missing value."""
        return "" if v is None else v

    @field_validator("doctype")
    @classmethod
    def validate_doctype(cls, v):
        """Validate that the doctype is a member of the DocType Enum."""
        if not v or v.strip() == "":
            raise ValueError("doctype cannot be empty")
        try:
            # Attempt to convert the string to an AttachedObjectType Enum member
            DocType[v]
        except KeyError:
            raise ValueError(f"doctype must be one of {[e.value for e in DocType]}")
        except Exception as e:
            raise ValueError(f"Invalid doctype format: {str(e)}")

        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        """Validate that the status is a member of the SDocStatus Enum."""
        # Attempt to convert the int to an SDocStatus Enum member
        try:
            SDocStatus(v)
        except ValueError:
            raise ValueError(f"status must be one of {[e.value for e in SDocStatus]}")
        except Exception as e:
            raise ValueError(f"Invalid status format: {str(e)}")

        return v

    @field_validator("step_status")
    @classmethod
    def validate_step_status(cls, v, info: ValidationInfo):
        """Validate that the values are statuses, and drop the keys that are no
        pipeline step of the doctype: an archive of another version may name a
        step this version does not have (renamed or removed)."""
        if "doctype" not in info.data:
            return v
        steps = {
            s.value
            for s in pipeline_registry.graph().steps(DocType(info.data["doctype"]))
        }
        for status in v.values():
            if status is not None:
                SDocStatus(status)
        return {step: status for step, status in v.items() if step in steps}

    @field_validator("tags")
    @classmethod
    def validate_lists(cls, v):
        """Validate that the field is a list."""
        if not isinstance(v, list):
            raise ValueError(f"{v} must be a list")

        return v

    @field_validator("word_frequencies", "metadata")
    @classmethod
    def validate_list_of_tuples(cls, v):
        """Validate that the field is a list of tuples."""
        if not isinstance(v, list):
            raise ValueError(f"{v} must be a list")
        for item in v:
            if not isinstance(item, tuple) or len(item) != 2:
                raise ValueError(f"{item} must be a tuple of length 2")
        return v

    @field_validator("sentence_embeddings")
    @classmethod
    def validate_sentence_embeddings_consistency(
        cls, sentence_embeddings: list[list[float]]
    ) -> list[list[float]]:
        """Validate that all embedding vectors in sentence_embeddings have the same length."""
        if len(sentence_embeddings) == 0:
            return sentence_embeddings

        # Get the length of the first embedding vector
        first_embedding_length = len(sentence_embeddings[0])

        # Check that all embedding vectors have the same length
        for i, embedding in enumerate(sentence_embeddings):
            if len(embedding) != first_embedding_length:
                raise ValueError(
                    f"All sentence embeddings must have the same length. "
                    f"Expected {first_embedding_length} but embedding at index {i} has length {len(embedding)}"
                )

        return sentence_embeddings

    @model_validator(mode="after")
    def validate_arrays_consistency(self) -> "SourceDocumentExportSchema":
        """Validate that related arrays have the same length. Whether the sentence
        embeddings are complete (one per sentence) is the archive module's
        question (`artefact_archive.py`): an incomplete archive imports with the
        step not planned."""
        # Validate token arrays
        if len(self.token_starts) != len(self.token_ends):
            raise ValueError(
                f"token_starts and token_ends must have the same length. "
                f"Got {len(self.token_starts)} and {len(self.token_ends)}"
            )

        # Validate sentence arrays
        if len(self.sentence_starts) != len(self.sentence_ends):
            raise ValueError(
                f"sentence_starts and sentence_ends must have the same length. "
                f"Got {len(self.sentence_starts)} and {len(self.sentence_ends)}"
            )

        # Validate token time arrays: either both are None or both are present
        if (self.token_time_starts is None) != (self.token_time_ends is None):
            raise ValueError(
                "token_time_starts and token_time_ends must either both be None or both be present"
            )

        # If both are present, check lengths
        if (
            self.token_time_starts is not None
            and self.token_time_ends is not None
            and len(self.token_time_starts) != len(self.token_time_ends)
        ):
            raise ValueError(
                f"token_time_starts and token_time_ends must have the same length. "
                f"Got {len(self.token_time_starts)} and {len(self.token_time_ends)}"
            )

        return self


class SourceDocumentExportCollection(BaseModel):
    """Collection of source documents for export/import operations."""

    source_documents: list[SourceDocumentExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "SourceDocumentExportCollection":
        """Convert a DataFrame to a SourceDocumentExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.replace({pd.NA: None, float("nan"): None})
        records = df_cleaned.to_dict("records")

        # The export writes lists as their Python representation (e.g. "[('a', 1)]").
        # The cells come from an uploaded file: parse them as literals, never evaluate them.
        processed_records = []
        for record in records:
            for field in [
                "tags",
                "token_starts",
                "token_ends",
                "sentence_starts",
                "sentence_ends",
                "document_embedding",
                "sentence_embeddings",
                "image_embedding",
                "token_time_starts",
                "token_time_ends",
                "word_frequencies",
                "metadata",
                "step_status",
            ]:
                if field in record and isinstance(record[field], str):
                    try:
                        record[field] = ast.literal_eval(record[field])
                    except (
                        SyntaxError,
                        ValueError,
                        TypeError,
                        MemoryError,
                        RecursionError,
                    ):
                        # Not a literal: keep the string, the schema validation rejects it
                        pass

            processed_records.append(record)

        source_documents = [
            SourceDocumentExportSchema(**record) for record in processed_records
        ]  # type: ignore
        return cls(source_documents=source_documents)

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the SourceDocumentExportSchema to a DataFrame."""
        records = [sdoc.model_dump() for sdoc in self.source_documents]
        return pd.DataFrame(records)
