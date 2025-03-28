from typing import List

import pandas as pd
from pydantic import BaseModel, Field, field_validator


class ProjectMetadataExportSchema(BaseModel):
    """Schema definition for project metadata export/import operations."""

    key: str = Field(description="Unique key for the metadata")
    metatype: str = Field(description="Type of the metadata")
    doctype: str = Field(description="Document type the metadata applies to")
    description: str = Field(description="Description of the metadata")
    read_only: bool = Field(
        description="Whether the metadata is read-only", default=False
    )

    @field_validator("key", "metatype", "doctype", "description")
    @classmethod
    def validate_required_fields(cls, v, info):
        if not v or v.strip() == "":
            raise ValueError(f"{info.field_name} cannot be empty")
        return v


class ProjectMetadataExportCollection(BaseModel):
    """Collection of project metadata for export/import operations."""

    metadata_items: List[ProjectMetadataExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "ProjectMetadataExportCollection":
        """Convert a DataFrame to a ProjectMetadataExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.replace({pd.NA: None, float("nan"): None, "nan": None})
        records = df_cleaned.to_dict("records")
        metadata_items = [ProjectMetadataExportSchema(**record) for record in records]  # type: ignore
        return cls(metadata_items=metadata_items)

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the ProjectMetadataExportCollection to a DataFrame."""
        records = [metadata.model_dump() for metadata in self.metadata_items]
        return pd.DataFrame(records)
