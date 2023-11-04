from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.data.dto.dto_base import UpdateDTOBase
from app.core.data.dto.project_metadata import ProjectMetadataRead


# Properties shared across all DTOs
class SourceDocumentMetadataBaseDTO(BaseModel):
    value: str = Field(description="Value of the SourceDocumentMetadata")


# Properties for creation
class SourceDocumentMetadataCreate(SourceDocumentMetadataBaseDTO):
    source_document_id: int = Field(
        description="SourceDocument the SourceDocumentMetadata belongs to"
    )
    project_metadata_id: int = Field(description="ID of the ProjectMetadata")


# Properties for updating
class SourceDocumentMetadataUpdate(BaseModel, UpdateDTOBase):
    value: Optional[str] = Field(
        description="Value of the SourceDocumentMetadata", default=None
    )


# Properties for reading (as in ORM)
class SourceDocumentMetadataRead(SourceDocumentMetadataBaseDTO):
    id: int = Field(description="ID of the SourceDocumentMetadata")
    project_metadata_id: int = Field(description="ID of the ProjectMetadata")
    source_document_id: int = Field(
        description="SourceDocument the SourceDocumentMetadata belongs to"
    )
    model_config = ConfigDict(from_attributes=True)


class SourceDocumentMetadataReadResolved(SourceDocumentMetadataBaseDTO):
    id: int = Field(description="ID of the SourceDocumentMetadata")
    source_document_id: int = Field(
        description="SourceDocument the SourceDocumentMetadata belongs to"
    )
    project_metadata: ProjectMetadataRead = Field(
        description="ProjectMetadata of the SourceDocumentMetadata"
    )
