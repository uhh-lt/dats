import pandas as pd
import srsly
from pydantic import BaseModel, Field, field_validator

from modules.timeline_analysis.timeline_analysis_dto import (
    TimelineAnalysisConceptForExport,
    TimelineAnalysisSettingsForExport,
)


class TimelineAnalysisExportSchema(BaseModel):
    """Schema definition for timeline analysis export/import operations."""

    name: str = Field(description="Name of the timeline analysis")
    type: str = Field(
        description="Type of the timeline analysis (document, span_annotation, etc.)"
    )
    settings: str = Field(description="JSON string of timeline analysis settings")
    concepts: str = Field(description="JSON string of timeline analysis concepts")

    @field_validator("name", "type", "settings", "concepts")
    @classmethod
    def validate_required_fields(cls, v, info):
        if not v or v.strip() == "":
            raise ValueError(f"{info.field_name} cannot be empty")
        return v

    @field_validator("settings")
    @classmethod
    def validate_settings_json(cls, v):
        """Validate that the settings field is a valid JSON string that can be parsed
        as TimelineAnalysisSettingsForExport."""
        if not v or v.strip() == "":
            return v

        try:
            # Validate using the TimelineAnalysisSettingsForExport schema
            TimelineAnalysisSettingsForExport.model_validate_json(v)
        except Exception as e:
            raise ValueError(f"Invalid settings JSON format: {str(e)}")

        return v

    @field_validator("concepts")
    @classmethod
    def validate_concepts_json(cls, v):
        """Validate that the concepts field is a valid JSON string that can be parsed
        as a list of TimelineAnalysisConceptForExport objects."""
        if not v or v.strip() == "":
            return v

        try:
            # Parse JSON string to list
            concepts_list = srsly.json_loads(v)

            # Ensure it's a list
            if not isinstance(concepts_list, list):
                raise ValueError("Concepts must be a JSON array")

            # Validate each concept using the TimelineAnalysisConceptForExport schema
            for concept in concepts_list:
                TimelineAnalysisConceptForExport.model_validate(concept)
        except Exception as e:
            raise ValueError(f"Invalid concepts JSON format: {str(e)}")

        return v


class TimelineAnalysisExportCollection(BaseModel):
    """Collection of timeline analyses for export/import operations."""

    timeline_analyses: list[TimelineAnalysisExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "TimelineAnalysisExportCollection":
        """Convert a DataFrame to a TimelineAnalysisExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.replace({pd.NA: None, float("nan"): None, "nan": None})
        records = df_cleaned.to_dict("records")
        timeline_analyses = [
            TimelineAnalysisExportSchema(**record)  # type: ignore
            for record in records
        ]
        return cls(timeline_analyses=timeline_analyses)

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the TimelineAnalysisExportCollection to a DataFrame."""
        records = [
            timeline_analysis.model_dump()
            for timeline_analysis in self.timeline_analyses
        ]
        return pd.DataFrame(records)
