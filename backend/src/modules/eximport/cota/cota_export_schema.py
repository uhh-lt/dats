import pandas as pd
import srsly
from pydantic import BaseModel, Field, field_validator

from modules.concept_over_time_analysis.cota_dto import (
    COTAConcept,
    COTATimelineSettings,
    COTATrainingSettings,
)


class COTAExportSchema(BaseModel):
    """Schema definition for concept over time analysis export/import operations."""

    name: str = Field(description="Name of the concept over time analysis")

    timeline_settings: str = Field(description="JSON string of COTA timeline settings")
    training_settings: str = Field(description="JSON string of COTA training settings")
    concepts: str = Field(description="JSON string of COTA concepts")

    @field_validator("name", "timeline_settings", "training_settings", "concepts")
    @classmethod
    def validate_required_fields(cls, v, info):
        if not v or v.strip() == "":
            raise ValueError(f"{info.field_name} cannot be empty")
        return v

    @field_validator("timeline_settings")
    @classmethod
    def validate_timeline_settings_json(cls, v):
        """Validate that the timeline_settings field is a valid JSON string that can be parsed
        as COTATimelineSettings."""
        if not v or v.strip() == "":
            return v

        try:
            # Validate using the COTATimelineSettings schema
            COTATimelineSettings.model_validate_json(v)
        except Exception as e:
            raise ValueError(f"Invalid timeline_settings JSON format: {str(e)}")

        return v

    @field_validator("training_settings")
    @classmethod
    def validate_training_settings_json(cls, v):
        """Validate that the training_settings field is a valid JSON string that can be parsed
        as COTATrainingSettings."""
        if not v or v.strip() == "":
            return v

        try:
            # Validate using the COTATrainingSettings schema
            COTATrainingSettings.model_validate_json(v)
        except Exception as e:
            raise ValueError(f"Invalid training_settings JSON format: {str(e)}")

        return v

    @field_validator("concepts")
    @classmethod
    def validate_concepts_json(cls, v):
        """Validate that the concepts field is a valid JSON string that can be parsed
        as a list of COTAConcept objects."""
        if not v or v.strip() == "":
            return v

        try:
            # Parse JSON string to list
            concepts_list = srsly.json_loads(v)

            # Ensure it's a list
            if not isinstance(concepts_list, list):
                raise ValueError("Concepts must be a JSON array")

            # Validate each concept using the COTAConcept schema
            for concept in concepts_list:
                COTAConcept.model_validate(concept)
        except Exception as e:
            raise ValueError(f"Invalid concepts JSON format: {str(e)}")

        return v


class COTAExportCollection(BaseModel):
    """Collection of concept over time analyses for export/import operations."""

    cota_analyses: list[COTAExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "COTAExportCollection":
        """Convert a DataFrame to a COTAExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.replace({pd.NA: None, float("nan"): None, "nan": None})
        records = df_cleaned.to_dict("records")
        cota_analyses = [
            COTAExportSchema(**record)  # type: ignore
            for record in records
        ]
        return cls(cota_analyses=cota_analyses)

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the COTAExportCollection to a DataFrame."""
        records = [cota_analysis.model_dump() for cota_analysis in self.cota_analyses]
        return pd.DataFrame(records)
