from pydantic import BaseModel, Field


class ProjectDetailsExportSchema(BaseModel):
    """Schema definition for the project details export/import operations."""

    title: str = Field(description="Title of the project")
    description: str = Field(description="Description of the project")
    enabled_features: list[str] = Field(
        description="Values of the features enabled in the project (Feature)"
    )
