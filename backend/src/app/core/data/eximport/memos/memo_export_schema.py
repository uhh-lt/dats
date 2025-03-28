from typing import List, Optional

import pandas as pd
from pydantic import BaseModel, Field, field_validator


class MemoExportSchema(BaseModel):
    """Schema definition for memo export operations."""

    user_first_name: Optional[str] = Field(
        description="First name of the user", default=None
    )
    user_last_name: Optional[str] = Field(
        description="Last name of the user", default=None
    )
    starred: bool = Field(description="Whether the memo is starred")
    content: str = Field(description="Content of the memo")
    attached_type: str = Field(description="Type of object the memo is attached to")

    # Optional fields for different attached types
    sdoc_name: Optional[str] = Field(
        description="Name of the source document", default=None
    )
    tag_name: Optional[str] = Field(
        description="Name of the document tag", default=None
    )
    span_group_name: Optional[str] = Field(
        description="Name of the span group", default=None
    )
    code_name: Optional[str] = Field(description="Name of the code", default=None)
    span_anno_text: Optional[str] = Field(
        description="Text of the span annotation", default=None
    )

    @field_validator("content")
    @classmethod
    def validate_required_fields(cls, v, info):
        if not v or v.strip() == "":
            raise ValueError(f"{info.field_name} cannot be empty")
        return v


class MemoExportCollection(BaseModel):
    """Collection of memos for export operations."""

    memos: List[MemoExportSchema]

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
