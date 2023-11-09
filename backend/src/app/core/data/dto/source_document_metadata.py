from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.data.dto.dto_base import UpdateDTOBase
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.meta_type import MetaType


# Properties shared across all DTOs
class SourceDocumentMetadataBaseDTO(BaseModel):
    int_value: Optional[int] = Field(
        description="Int Value of the SourceDocumentMetadata"
    )
    str_value: Optional[str] = Field(
        description="String Value of the SourceDocumentMetadata"
    )
    boolean_value: Optional[bool] = Field(
        description="Boolean Value of the SourceDocumentMetadata"
    )
    date_value: Optional[datetime] = Field(
        description="Date Value of the SourceDocumentMetadata"
    )
    list_value: Optional[List[str]] = Field(
        description="List Value of the SourceDocumentMetadata"
    )


# Properties for creation
class SourceDocumentMetadataCreate(SourceDocumentMetadataBaseDTO):
    source_document_id: int = Field(
        description="SourceDocument the SourceDocumentMetadata belongs to"
    )
    project_metadata_id: int = Field(description="ID of the ProjectMetadata")

    @staticmethod
    def with_metatype(
        source_document_id: int,
        project_metadata_id: int,
        metatype: MetaType,
        value=None,
    ) -> "SourceDocumentMetadataCreate":
        match metatype:
            case MetaType.STRING:
                return SourceDocumentMetadataCreate(
                    str_value=value if value is not None else "",
                    source_document_id=source_document_id,
                    project_metadata_id=project_metadata_id,
                )
            case MetaType.NUMBER:
                return SourceDocumentMetadataCreate(
                    int_value=value if value is not None else 0,
                    source_document_id=source_document_id,
                    project_metadata_id=project_metadata_id,
                )
            case MetaType.DATE:
                return SourceDocumentMetadataCreate(
                    date_value=value if value is not None else datetime.now(),
                    source_document_id=source_document_id,
                    project_metadata_id=project_metadata_id,
                )
            case MetaType.BOOLEAN:
                return SourceDocumentMetadataCreate(
                    boolean_value=value if value is not None else False,
                    source_document_id=source_document_id,
                    project_metadata_id=project_metadata_id,
                )
            case MetaType.LIST:
                return SourceDocumentMetadataCreate(
                    list_value=value if value is not None else [],
                    source_document_id=source_document_id,
                    project_metadata_id=project_metadata_id,
                )
        return SourceDocumentMetadataCreate(
            str_value=value,
            source_document_id=source_document_id,
            project_metadata_id=project_metadata_id,
        )


# Properties for updating
class SourceDocumentMetadataUpdate(SourceDocumentMetadataBaseDTO, UpdateDTOBase):
    pass


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

    class Config:
        orm_mode = True
