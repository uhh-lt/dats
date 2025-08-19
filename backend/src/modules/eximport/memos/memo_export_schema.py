import json

import pandas as pd
from pydantic import BaseModel, Field, field_validator

from core.memo.memo_dto import AttachedObjectType


class MemoExportSchema(BaseModel):
    """Schema definition for memo export operations."""

    uuid: str = Field(description="UUID of the memo")
    user_email: str = Field(description="Email of the user who created the memo")
    starred: bool = Field(description="Whether the memo is starred")
    title: str = Field(description="Title of the memo")
    content: str | None = Field(description="Content of the memo")
    content_json: str | None = Field(description="JSON Content of the memo")
    attached_type: str = Field(description="Type of object the memo is attached to")
    attached_to: str = Field(
        description="Unique identifier of the object the memo is attached to"
    )

    @field_validator(
        "uuid",
        "user_email",
        "title",
        "attached_type",
        "attached_to",
    )
    @classmethod
    def validate_required_fields(cls, v, info):
        if not v or v.strip() == "":
            raise ValueError(f"{info.field_name} cannot be empty")
        return v

    @field_validator("attached_type")
    @classmethod
    def validate_attached_type(cls, v):
        """Validate that the attached_type is a member of the AttachedObjectType Enum."""
        if not v or v.strip() == "":
            raise ValueError("attached_type cannot be empty")
        try:
            # Attempt to convert the string to an AttachedObjectType Enum member
            AttachedObjectType[v]
        except KeyError:
            raise ValueError(
                f"attached_type must be one of {[e.value for e in AttachedObjectType]}"
            )
        except Exception as e:
            raise ValueError(f"Invalid attached_type format: {str(e)}")

        return v

    ## validate that content_json is a valid JSON string
    @field_validator("content_json")
    @classmethod
    def validate_content_json(cls, v):
        """Validate that the content_json field is a valid JSON string."""
        if not v or v.strip() == "":
            return v

        try:
            # Attempt to parse the JSON string
            json.loads(v)
        except Exception as e:
            raise ValueError(f"Invalid JSON format: {str(e)}")

        return v


class MemoExportCollection(BaseModel):
    """Collection of memos for export operations."""

    memos: list[MemoExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "MemoExportCollection":
        """Convert a DataFrame to a MemoExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.replace({pd.NA: None, float("nan"): None, "nan": None})
        records = df_cleaned.to_dict("records")
        memos = [MemoExportSchema(**record) for record in records]  # type: ignore
        return cls(memos=memos)

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the MemoExportCollection to a DataFrame."""
        records = [memo.model_dump() for memo in self.memos]
        return pd.DataFrame(records)
