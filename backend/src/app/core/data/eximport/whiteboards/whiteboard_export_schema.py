from typing import List

import pandas as pd
from pydantic import BaseModel, Field, field_validator


class WhiteboardExportSchema(BaseModel):
    """Schema definition for whiteboard export/import operations."""

    whiteboard_title: str = Field(description="Title of the whiteboard")
    user_email: str = Field(description="Email of the whiteboard owner")
    content: str = Field(description="JSON content of the whiteboard")

    @field_validator("whiteboard_title")
    @classmethod
    def validate_whiteboard_title(cls, v):
        if not v or v.strip() == "":
            raise ValueError("whiteboard_title cannot be empty")
        return v

    @field_validator("user_email")
    @classmethod
    def validate_user_email(cls, v):
        if not v or v.strip() == "":
            raise ValueError("user_email cannot be empty")
        return v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v):
        if not v or v.strip() == "":
            # Content should be at least an empty JSON object/array
            return '{"nodes":[],"edges":[]}'
        return v


class WhiteboardExportCollection(BaseModel):
    """Collection of whiteboards for export/import operations."""

    whiteboards: List[WhiteboardExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "WhiteboardExportCollection":
        """Convert a DataFrame to a WhiteboardExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.replace({pd.NA: None, float("nan"): None, "nan": None})
        records = df_cleaned.to_dict("records")
        whiteboards = [WhiteboardExportSchema(**record) for record in records]  # type: ignore
        return cls(whiteboards=whiteboards)

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the WhiteboardExportCollection to a DataFrame."""
        records = [whiteboard.model_dump() for whiteboard in self.whiteboards]
        return pd.DataFrame(records)
