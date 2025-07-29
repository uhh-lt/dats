import pandas as pd
from pydantic import BaseModel, Field, field_validator


class TagExportSchema(BaseModel):
    """Schema definition for tag export/import operations."""

    tag_name: str = Field(description="Unique name of the tag within a project")
    description: str = Field(description="Description of the tag", default="")
    color: str | None = Field(description="Color of the tag", default=None)
    parent_tag_name: str | None = Field(
        description="Name of the parent tag", default=None
    )

    @field_validator("tag_name")
    @classmethod
    def validate_tag_name(cls, v):
        if not v or v.strip() == "":
            raise ValueError("tag_name cannot be empty")
        return v


class TagExportCollection(BaseModel):
    """Collection of tags for export/import operations."""

    tags: list[TagExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "TagExportCollection":
        """Convert a DataFrame to a TagExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.replace({pd.NA: None, float("nan"): None, "nan": None})
        records = df_cleaned.to_dict("records")
        tags = [TagExportSchema(**record) for record in records]  # type: ignore
        return cls(tags=tags)

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the TagExportCollection to a DataFrame."""
        records = [tag.model_dump() for tag in self.tags]
        return pd.DataFrame(records)

    @field_validator("tags")
    @classmethod
    def validate_unique_tag_names(cls, tags):
        """Validate that all tag names are unique."""
        tag_names = [tag.tag_name for tag in tags]
        if len(tag_names) != len(set(tag_names)):
            duplicates = [name for name in set(tag_names) if tag_names.count(name) > 1]
            raise ValueError(f"Duplicate tag names found: {duplicates}")
        return tags

    @field_validator("tags")
    @classmethod
    def validate_parent_references(cls, tags):
        """Validate that all parent tag references exist in the collection."""
        tag_names = {tag.tag_name for tag in tags}
        for tag in tags:
            if tag.parent_tag_name and tag.parent_tag_name not in tag_names:
                raise ValueError(
                    f"Parent tag '{tag.parent_tag_name}' referenced by '{tag.tag_name}' not found in the collection"
                )
        return tags
