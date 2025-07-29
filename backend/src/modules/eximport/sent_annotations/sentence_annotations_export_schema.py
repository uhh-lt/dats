import pandas as pd
from pydantic import BaseModel, Field, field_validator


class SentenceAnnotationExportSchema(BaseModel):
    """Schema definition for sentence annotation export/import operations."""

    uuid: str = Field(description="UUID of the sentence annotation")
    sdoc_name: str = Field(description="Name of the source document")
    user_email: str = Field(description="Email of the user who created the annotation")
    code_name: str = Field(description="Name of the code assigned to the annotation")
    text_begin_sent: int = Field(description="Starting sentence ID of the annotation")
    text_end_sent: int = Field(description="Ending sentence ID of the annotation")
    text: str | None = Field(description="Text content of the annotation", default=None)
    user_first_name: str | None = Field(
        description="First name of the user", default=None
    )
    user_last_name: str | None = Field(
        description="Last name of the user", default=None
    )

    @field_validator("uuid", "sdoc_name", "user_email", "code_name")
    @classmethod
    def validate_required_fields(cls, v, info):
        if not v or v.strip() == "":
            raise ValueError(f"{info.field_name} cannot be empty")
        return v

    @field_validator("text_begin_sent", "text_end_sent")
    @classmethod
    def validate_sentence_ids(cls, v):
        if v < 0:
            raise ValueError(f"Sentence ID must be larger than or equal to 0, got {v}")
        return v


class SentenceAnnotationExportCollection(BaseModel):
    """Collection of sentence annotations for export/import operations."""

    annotations: list[SentenceAnnotationExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "SentenceAnnotationExportCollection":
        """Convert a DataFrame to a SentenceAnnotationExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.replace({pd.NA: None, float("nan"): None, "nan": None})
        records = df_cleaned.to_dict("records")
        annotations = [SentenceAnnotationExportSchema(**record) for record in records]  # type: ignore
        return cls(annotations=annotations)

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the SentenceAnnotationExportCollection to a DataFrame."""
        records = [annotation.model_dump() for annotation in self.annotations]
        return pd.DataFrame(records)
