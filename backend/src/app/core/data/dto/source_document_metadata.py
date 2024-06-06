from datetime import datetime
from typing import List, Optional, Union

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
        metatype: MetaType | str,
        value=None,
    ) -> "SourceDocumentMetadataCreate":
        match metatype:
            case MetaType.STRING:
                return SourceDocumentMetadataCreate(
                    str_value=str(value) if value is not None else "",
                    boolean_value=None,
                    date_value=None,
                    int_value=None,
                    list_value=None,
                    source_document_id=source_document_id,
                    project_metadata_id=project_metadata_id,
                )
            case MetaType.NUMBER:
                return SourceDocumentMetadataCreate(
                    str_value=None,
                    boolean_value=None,
                    date_value=None,
                    int_value=round(float(value)) if value is not None else 0,
                    list_value=None,
                    source_document_id=source_document_id,
                    project_metadata_id=project_metadata_id,
                )
            case MetaType.DATE:
                return SourceDocumentMetadataCreate(
                    str_value=None,
                    boolean_value=None,
                    date_value=value if value is not None else datetime.now(),
                    int_value=None,
                    list_value=None,
                    source_document_id=source_document_id,
                    project_metadata_id=project_metadata_id,
                )
            case MetaType.BOOLEAN:
                return SourceDocumentMetadataCreate(
                    str_value=None,
                    boolean_value=bool(value) if value is not None else False,
                    date_value=None,
                    int_value=None,
                    list_value=None,
                    source_document_id=source_document_id,
                    project_metadata_id=project_metadata_id,
                )
            case MetaType.LIST:
                list_value = value if value is not None else []
                if isinstance(list_value, str):
                    list_value = [list_value]
                return SourceDocumentMetadataCreate(
                    str_value=None,
                    boolean_value=None,
                    date_value=None,
                    int_value=None,
                    list_value=list_value,
                    source_document_id=source_document_id,
                    project_metadata_id=project_metadata_id,
                )
        return SourceDocumentMetadataCreate(
            str_value=str(value),
            boolean_value=None,
            date_value=None,
            int_value=None,
            list_value=None,
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
    model_config = ConfigDict(from_attributes=True)

    def get_value(self) -> Union[str, int, datetime, bool, List, None]:
        match self.project_metadata.metatype:
            case MetaType.STRING:
                return self.str_value
            case MetaType.NUMBER:
                return self.int_value
            case MetaType.DATE:
                return self.date_value
            case MetaType.BOOLEAN:
                return self.boolean_value
            case MetaType.LIST:
                return self.list_value
        return None
