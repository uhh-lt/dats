import pandas as pd
from pydantic import BaseModel, Field, field_validator


class BBoxAnnotationExportSchema(BaseModel):
    """Schema definition for bbox annotation export/import operations."""

    uuid: str = Field(description="UUID of the bbox annotation")
    sdoc_name: str = Field(description="Name of the source document")
    user_email: str = Field(description="Email of the user who created the annotation")
    code_name: str = Field(description="Name of the code assigned to the annotation")
    bbox_x_min: int = Field(description="Minimum X coordinate of the bounding box")
    bbox_x_max: int = Field(description="Maximum X coordinate of the bounding box")
    bbox_y_min: int = Field(description="Minimum Y coordinate of the bounding box")
    bbox_y_max: int = Field(description="Maximum Y coordinate of the bounding box")
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

    @field_validator("bbox_x_min", "bbox_x_max", "bbox_y_min", "bbox_y_max")
    @classmethod
    def validate_bbox_coordinates(cls, v):
        if v < 0:
            raise ValueError(f"Bbox coordinate must be larger than 0, got {v}")
        return v


class BBoxAnnotationExportCollection(BaseModel):
    """Collection of bbox annotations for export/import operations."""

    annotations: list[BBoxAnnotationExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "BBoxAnnotationExportCollection":
        """Convert a DataFrame to a BBoxAnnotationExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.replace({pd.NA: None, float("nan"): None, "nan": None})
        records = df_cleaned.to_dict("records")
        annotations = [BBoxAnnotationExportSchema(**record) for record in records]  # type: ignore
        return cls(annotations=annotations)

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the BBoxAnnotationExportCollection to a DataFrame."""
        records = [annotation.model_dump() for annotation in self.annotations]
        return pd.DataFrame(records)
