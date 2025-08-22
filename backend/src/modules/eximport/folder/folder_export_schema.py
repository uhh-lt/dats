import pandas as pd
from pydantic import BaseModel, Field, field_validator


class FolderExportSchema(BaseModel):
    """Schema definition for folder export/import operations. (FolderType normal)"""

    folder_name: str = Field(description="Unique name of the folder within a project")
    parent_folder_name: str | None = Field(
        description="Name of the parent folder", default=None
    )

    @field_validator("folder_name")
    @classmethod
    def validate_folder_name(cls, v):
        if not v or v.strip() == "":
            raise ValueError("folder_name cannot be empty")
        return v


class FolderExportCollection(BaseModel):
    """Collection of folders for export/import operations."""

    folders: list[FolderExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "FolderExportCollection":
        """Convert a DataFrame to a folderExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.replace({pd.NA: None, float("nan"): None, "nan": None})
        records = df_cleaned.to_dict("records")
        folders = [FolderExportSchema(**record) for record in records]  # type: ignore
        return cls(folders=folders)

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the FolderExportCollection to a DataFrame."""
        records = [folder.model_dump() for folder in self.folders]
        return pd.DataFrame(records)

    @field_validator("folders")
    @classmethod
    def validate_unique_folder_names(cls, folders):
        """Validate that all folder names are unique."""
        folder_names = [folder.folder_name for folder in folders]
        if len(folder_names) != len(set(folder_names)):
            duplicates = [
                name for name in set(folder_names) if folder_names.count(name) > 1
            ]
            raise ValueError(f"Duplicate folder names found: {duplicates}")
        return folders

    @field_validator("folders")
    @classmethod
    def validate_parent_references(cls, folders):
        """Validate that all parent folder references exist in the collection."""
        folder_names = {folder.folder_name for folder in folders}
        for folder in folders:
            if (
                folder.parent_folder_name
                and folder.parent_folder_name not in folder_names
            ):
                raise ValueError(
                    f"Parent folder '{folder.parent_folder_name}' referenced by '{folder.folder_name}' not found in the collection"
                )
        return folders
