from typing import List, Optional

import pandas as pd
from pydantic import BaseModel, Field, field_validator


class UserExportSchema(BaseModel):
    """Schema definition for user export/import operations."""

    email: str = Field(description="Email of the user")
    first_name: Optional[str] = Field(
        description="First name of the user", default=None
    )
    last_name: Optional[str] = Field(description="Last name of the user", default=None)

    @field_validator("email")
    @classmethod
    def validate_required_fields(cls, v, info):
        if not v or v.strip() == "":
            raise ValueError(f"{info.field_name} cannot be empty")
        return v


class UserExportCollection(BaseModel):
    """Collection of users for export/import operations."""

    users: List[UserExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "UserExportCollection":
        """Convert a DataFrame to a UserExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.replace({pd.NA: None, float("nan"): None, "nan": None})
        records = df_cleaned.to_dict("records")
        users = [UserExportSchema(**record) for record in records]  # type: ignore
        return cls(users=users)

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the UserExportCollection to a DataFrame."""
        records = [user.model_dump() for user in self.users]
        return pd.DataFrame(records)
