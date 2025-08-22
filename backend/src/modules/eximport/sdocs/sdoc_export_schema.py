import pandas as pd
from pydantic import BaseModel, Field, field_validator

from common.doc_type import DocType
from common.sdoc_status_enum import SDocStatus


class SourceDocumentExportSchema(BaseModel):
    """Schema definition for source document info export/import operations."""

    # Info about the source document itself
    filename: str = Field(description="Filename of the source document")
    name: str | None = Field(description="Name of the source document", default=None)
    doctype: str = Field(description="Document type of the source document")
    status: int = Field(description="Status of the source document")

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
    document_embedding: list[float] = Field(
        description="Document embedding of the source document"
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

    @classmethod
    @field_validator("sentence_embeddings")
    def validate_sentence_embeddings_consistency(cls, sentence_embeddings):
        """Validate that all embedding vectors in sentence_embeddings have the same length."""
        if not sentence_embeddings or len(sentence_embeddings) == 0:
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

    @classmethod
    @field_validator("__all__", mode="after")
    def validate_arrays_consistency(cls, values, info):
        """Validate that related arrays have the same length."""
        # Skip validation if this isn't the whole model
        if not isinstance(values, dict):
            return values

        # Validate token arrays
        token_starts = values.get("token_starts")
        token_ends = values.get("token_ends")
        if token_starts is None or token_ends is None:
            raise ValueError(
                "token_starts and token_ends must be present for all source documents"
            )

        if len(token_starts) != len(token_ends):
            raise ValueError(
                f"token_starts and token_ends must have the same length. "
                f"Got {len(token_starts)} and {len(token_ends)}"
            )

        # Validate sentence arrays
        sentence_starts = values.get("sentence_starts")
        sentence_ends = values.get("sentence_ends")
        sentence_embeddings = values.get("sentence_embeddings")
        if (
            sentence_starts is None
            or sentence_ends is None
            or sentence_embeddings is None
        ):
            raise ValueError(
                "sentence_starts, sentence_ends and sentence_embeddings must be present"
            )

        if len(sentence_starts) != len(sentence_ends):
            raise ValueError(
                f"sentence_starts and sentence_ends must have the same length. "
                f"Got {len(sentence_starts)} and {len(sentence_ends)}"
            )

        if len(sentence_starts) != len(sentence_embeddings):
            raise ValueError(
                f"sentence_starts and sentence_embeddings must have the same length. "
                f"Got {len(sentence_starts)} and {len(sentence_embeddings)}"
            )

        # Validate token time arrays
        token_time_starts = values.get("token_time_starts")
        token_time_ends = values.get("token_time_ends")

        # Check if one is None and the other isn't
        if (token_time_starts is None) != (token_time_ends is None):
            raise ValueError(
                "token_time_starts and token_time_ends must either both be None or both be present"
            )

        # If both are present, check lengths
        if token_time_starts and token_time_ends:
            if len(token_time_starts) != len(token_time_ends):
                raise ValueError(
                    f"token_time_starts and token_time_ends must have the same length. "
                    f"Got {len(token_time_starts)} and {len(token_time_ends)}"
                )

        return values

    @classmethod
    @field_validator("__all__", mode="after")
    def validate_image_embedding(cls, values, info):
        """Validate that image_embedding is present for image documents."""
        # Skip validation if this isn't the whole model
        if not isinstance(values, dict):
            return values

        # Validate image embedding for image documents
        doctype = values.get("doctype")
        image_embedding = values.get("image_embedding")

        if doctype == "image" and image_embedding is None:
            raise ValueError("image_embedding must be present for image documents")

        return values


class SourceDocumentExportCollection(BaseModel):
    """Collection of source documents for export/import operations."""

    source_documents: list[SourceDocumentExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "SourceDocumentExportCollection":
        """Convert a DataFrame to a SourceDocumentExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.replace({pd.NA: None, float("nan"): None, "nan": None})
        records = df_cleaned.to_dict("records")

        # Process each record to convert string representations back to Python objects
        processed_records = []
        for record in records:
            # Convert string representations of lists and tuples back to Python objects
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
            ]:
                if field in record and isinstance(record[field], str):
                    try:
                        # Safe evaluation of string representation to Python object
                        record[field] = eval(record[field])
                    except (SyntaxError, NameError, ValueError):
                        # If eval fails, keep as is - validation will catch it later
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
