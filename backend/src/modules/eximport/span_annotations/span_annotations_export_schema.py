import pandas as pd
from pydantic import BaseModel, Field, field_validator


class SpanAnnotationExportSchema(BaseModel):
    """Schema definition for span annotation export/import operations."""

    uuid: str = Field(description="UUID of the span annotation")
    sdoc_name: str = Field(description="Name of the source document")
    user_email: str = Field(description="Email of the user who created the annotation")
    code_name: str = Field(description="Name of the code assigned to the annotation")
    text: str = Field(description="The text content of the span annotation")
    text_begin_char: int = Field(
        description="Begin position of the span annotation in characters"
    )
    text_end_char: int = Field(
        description="End position of the span annotation in characters"
    )
    text_begin_token: int = Field(
        description="Begin position of the span annotation in tokens"
    )
    text_end_token: int = Field(
        description="End position of the span annotation in tokens"
    )
    user_first_name: str | None = Field(
        description="First name of the user", default=None
    )
    user_last_name: str | None = Field(
        description="Last name of the user", default=None
    )

    @field_validator("uuid", "sdoc_name", "user_email", "code_name", "text")
    @classmethod
    def validate_required_fields(cls, v, info):
        if not v or v.strip() == "":
            raise ValueError(f"{info.field_name} cannot be empty")
        return v

    @field_validator(
        "text_begin_char", "text_end_char", "text_begin_token", "text_end_token"
    )
    @classmethod
    def validate_span_positions(cls, v):
        if v < 0:
            raise ValueError(
                f"Span position must be larger than or equal to 0, got {v}"
            )
        return v


class SpanAnnotationExportCollection(BaseModel):
    """Collection of span annotations for export/import operations."""

    annotations: list[SpanAnnotationExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "SpanAnnotationExportCollection":
        """Convert a DataFrame to a SpanAnnotationExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.replace({pd.NA: None, float("nan"): None, "nan": None})
        records = df_cleaned.to_dict("records")
        annotations = [SpanAnnotationExportSchema(**record) for record in records]  # type: ignore
        return cls(annotations=annotations)

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the SpanAnnotationExportCollection to a DataFrame."""
        records = [annotation.model_dump() for annotation in self.annotations]
        return pd.DataFrame(records)
