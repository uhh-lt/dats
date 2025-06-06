from typing import List, Optional, Tuple, Union

import pandas as pd
from app.core.data.doc_type import DocType
from app.core.data.dto.source_document import SDocStatus
from pydantic import BaseModel, Field, field_validator


class SourceDocumentExportSchema(BaseModel):
    """Schema definition for source document info export/import operations."""

    # Info about the source document itself
    filename: str = Field(description="Filename of the source document")
    name: Optional[str] = Field(description="Name of the source document", default=None)
    doctype: str = Field(description="Document type of the source document")
    status: str = Field(description="Status of the source document")

    # Data attached to the source document
    tags: List[str] = Field(
        description="List of tags (tag names) associated with the source document"
    )
    links: List[str] = Field(
        description="List of links (source document filenames) associated with the source document"
    )
    word_frequencies: List[Tuple[str, int]] = Field(
        description="List of word frequencies (word, frequency) associated with the source document"
    )
    metadata: List[Tuple[str, Union[str, int, bool, List]]] = Field(
        description="List of metadata (key, value) associated with the source document"
    )

    # Processed data of the source document
    content: Optional[str] = Field(description="Content of the source document")
    html: str = Field(description="HTML representation of the source document")
    token_starts: List[int] = Field(
        description="List of start positions of tokens in the source document"
    )
    token_ends: List[int] = Field(
        description="List of end positions of tokens in the source document"
    )
    sentence_starts: List[int] = Field(
        description="List of start positions of sentences in the source document"
    )
    sentence_ends: List[int] = Field(
        description="List of end positions of sentences in the source document"
    )
    token_time_starts: Optional[List[int]] = Field(
        description="List of start times of tokens in the source document. (Only for audio/video files)",
        default=None,
    )
    token_time_ends: Optional[List[int]] = Field(
        description="List of end times of tokens in the source document. (Only for audio/video files)",
        default=None,
    )

    # Embeddings of the source document
    document_embedding: List[float] = Field(
        description="Document embedding of the source document"
    )
    image_embedding: Optional[List[float]] = Field(
        description="Image embedding of the source document (Only for image files)",
        default=None,
    )
    sentence_embeddings: List[List[float]] = Field(
        description="List of sentence embeddings of the source document"
    )

    @field_validator("filename", "doctype", "status")
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
        if not v or v.strip() == "":
            raise ValueError("status cannot be empty")
        try:
            # Attempt to convert the string to an AttachedObjectType Enum member
            SDocStatus[v]
        except KeyError:
            raise ValueError(f"status must be one of {[e.value for e in SDocStatus]}")
        except Exception as e:
            raise ValueError(f"Invalid status format: {str(e)}")

        return v

    @field_validator("tags", "links")
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

    source_documents: List[SourceDocumentExportSchema]

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
                "links",
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
