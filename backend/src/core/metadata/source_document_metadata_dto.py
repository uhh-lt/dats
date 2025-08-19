from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from common.meta_type import MetaType
from core.metadata.project_metadata_dto import ProjectMetadataRead
from repos.db.dto_base import UpdateDTOBase


# Properties shared across all DTOs
class SourceDocumentMetadataBaseDTO(BaseModel):
    int_value: int | None = Field(description="Int Value of the SourceDocumentMetadata")
    str_value: str | None = Field(
        description="String Value of the SourceDocumentMetadata"
    )
    boolean_value: bool | None = Field(
        description="Boolean Value of the SourceDocumentMetadata"
    )
    date_value: datetime | None = Field(
        description="Date Value of the SourceDocumentMetadata"
    )
    list_value: list[str] | None = Field(
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


class SourceDocumentMetadataBulkUpdate(SourceDocumentMetadataBaseDTO, UpdateDTOBase):
    id: int = Field(description="ID of the SourceDocumentMetadata")


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

    def get_value(self) -> str | int | datetime | bool | list | None:
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

    def get_value_serializable(self) -> str | int | bool | list | None:
        match self.project_metadata.metatype:
            case MetaType.STRING:
                return self.str_value
            case MetaType.NUMBER:
                return self.int_value
            case MetaType.DATE:
                return (
                    self.date_value.isoformat() if self.date_value else self.date_value
                )
            case MetaType.BOOLEAN:
                return self.boolean_value
            case MetaType.LIST:
                return self.list_value

    @staticmethod
    def with_value(
        sdoc_metadata_id: int,
        source_document_id: int,
        project_metadata: ProjectMetadataRead,
        value: str,
    ) -> "SourceDocumentMetadataReadResolved":
        match project_metadata.metatype:
            case MetaType.STRING:
                return SourceDocumentMetadataReadResolved(
                    id=sdoc_metadata_id,
                    str_value=str(value) if value is not None else "",
                    boolean_value=None,
                    date_value=None,
                    int_value=None,
                    list_value=None,
                    source_document_id=source_document_id,
                    project_metadata=project_metadata,
                )
            case MetaType.NUMBER:
                return SourceDocumentMetadataReadResolved(
                    id=sdoc_metadata_id,
                    str_value=None,
                    boolean_value=None,
                    date_value=None,
                    int_value=round(float(value)) if value is not None else 0,
                    list_value=None,
                    source_document_id=source_document_id,
                    project_metadata=project_metadata,
                )
            case MetaType.DATE:
                return SourceDocumentMetadataReadResolved(
                    id=sdoc_metadata_id,
                    str_value=None,
                    boolean_value=None,
                    date_value=datetime.fromisoformat(value),
                    int_value=None,
                    list_value=None,
                    source_document_id=source_document_id,
                    project_metadata=project_metadata,
                )
            case MetaType.BOOLEAN:
                return SourceDocumentMetadataReadResolved(
                    id=sdoc_metadata_id,
                    str_value=None,
                    boolean_value=bool(value) if value is not None else False,
                    date_value=None,
                    int_value=None,
                    list_value=None,
                    source_document_id=source_document_id,
                    project_metadata=project_metadata,
                )
            case MetaType.LIST:
                list_value = value if value is not None else []
                if isinstance(list_value, str):
                    list_value = [list_value]
                return SourceDocumentMetadataReadResolved(
                    id=sdoc_metadata_id,
                    str_value=None,
                    boolean_value=None,
                    date_value=None,
                    int_value=None,
                    list_value=list_value,
                    source_document_id=source_document_id,
                    project_metadata=project_metadata,
                )
