from typing import Optional

from app.core.data.dto.dto_base import UpdateDTOBase
from pydantic import BaseModel, Field


# Properties shared across all DTOs
class SourceDocumentMetadataBaseDTO(BaseModel):
    key: str = Field(description="Key of the SourceDocumentMetadata")
    value: str = Field(description="Value of the SourceDocumentMetadata")


# Properties for creation
class SourceDocumentMetadataCreate(SourceDocumentMetadataBaseDTO):
    source_document_id: int = Field(
        description="SourceDocument the SourceDocumentMetadata belongs to"
    )
    read_only: Optional[bool] = Field(
        description=(
            "Flag that tells if the SourceDocumentMetadata cannot be changed."
            " Used for system generated metadata! Use False for user metadata."
        ),
        default=False,
    )


# Properties for updating
class SourceDocumentMetadataUpdate(SourceDocumentMetadataBaseDTO, UpdateDTOBase):
    key: Optional[str] = Field(
        description="Key of the SourceDocumentMetadata", default=None
    )
    value: Optional[str] = Field(
        description="Value of the SourceDocumentMetadata", default=None
    )


# Properties for reading (as in ORM)
class SourceDocumentMetadataRead(SourceDocumentMetadataBaseDTO):
    id: int = Field(description="ID of the SourceDocumentMetadata")
    key: str = Field(description="Key of the SourceDocumentMetadata")
    value: str = Field(description="Value of the SourceDocumentMetadata")
    read_only: bool = Field(
        description=(
            "Flag that tells if the SourceDocumentMetadata cannot be changed."
            " Used for system generated metadata! Use False for user metadata."
        ),
        default=False,
    )
    source_document_id: int = Field(
        description="SourceDocument the SourceDocumentMetadata belongs to"
    )

    class Config:
        orm_mode = True
