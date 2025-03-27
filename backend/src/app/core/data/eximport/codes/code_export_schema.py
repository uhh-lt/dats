from typing import List, Optional

import pandas as pd
from pydantic import BaseModel, Field, field_validator


class CodeExportSchema(BaseModel):
    """Schema definition for code export/import operations."""

    code_name: str = Field(description="Unique name of the code within a project")
    description: str = Field(description="Description of the code", default="")
    color: Optional[str] = Field(description="Color of the code", default=None)
    parent_code_name: Optional[str] = Field(
        description="Name of the parent code", default=None
    )

    @field_validator("code_name")
    @classmethod
    def validate_code_name(cls, v):
        if not v or v.strip() == "":
            raise ValueError("code_name cannot be empty")
        return v


class CodeExportCollection(BaseModel):
    """Collection of codes for export/import operations."""

    codes: List[CodeExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "CodeExportCollection":
        """Convert a DataFrame to a CodeExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.replace({pd.NA: None, float("nan"): None, "nan": None})
        records = df_cleaned.to_dict("records")
        codes = [CodeExportSchema(**record) for record in records]  # type: ignore
        return cls(codes=codes)

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the CodeExportCollection to a DataFrame."""
        records = [code.model_dump() for code in self.codes]
        return pd.DataFrame(records)

    @field_validator("codes")
    @classmethod
    def validate_unique_code_names(cls, codes):
        """Validate that all code names are unique."""
        code_names = [code.code_name for code in codes]
        if len(code_names) != len(set(code_names)):
            duplicates = [
                name for name in set(code_names) if code_names.count(name) > 1
            ]
            raise ValueError(f"Duplicate code names found: {duplicates}")
        return codes

    @field_validator("codes")
    @classmethod
    def validate_parent_references(cls, codes):
        """Validate that all parent code references exist in the collection."""
        code_names = {code.code_name for code in codes}
        for code in codes:
            if code.parent_code_name and code.parent_code_name not in code_names:
                raise ValueError(
                    f"Parent code '{code.parent_code_name}' referenced by '{code.code_name}' not found in the collection"
                )
        return codes
