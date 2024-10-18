from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.data.doc_type import DocType
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.dto_base import UpdateDTOBase
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataRead

SDOC_FILENAME_MAX_LENGTH = 200
SDOC_SUFFIX_MAX_LENGTH = 30


class SDocStatus(str, Enum):
    unfinished_or_erroneous = "unfinished_or_erroneous"
    finished = "finished"  # preprocessing has finished


# Properties shared across all DTOs
class SourceDocumentBaseDTO(BaseModel):
    filename: str = Field(
        description="Filename of the SourceDocument",
        max_length=SDOC_FILENAME_MAX_LENGTH + SDOC_SUFFIX_MAX_LENGTH,
    )
    name: Optional[str] = Field(
        description="User-defined name of the document", default=None
    )
    doctype: DocType = Field(description="DOCTYPE of the SourceDocument")
    status: SDocStatus = Field(description="Status of the SourceDocument")
    project_id: int = Field(description="Project the SourceDocument belongs to")


# Properties for updating
class SourceDocumentUpdate(BaseModel, UpdateDTOBase):
    name: str = Field(
        description="User-defined name of the document (default is the filename)"
    )


# Properties for reading (as in ORM)
class SourceDocumentRead(SourceDocumentBaseDTO):
    id: int = Field(description="ID of the SourceDocument")
    created: datetime = Field(description="The created timestamp of the SourceDocument")
    updated: datetime = Field(description="Updated timestamp of the Memo")
    model_config = ConfigDict(from_attributes=True)


class SourceDocumentReadAction(SourceDocumentRead):
    tags: List[DocumentTagRead] = Field(description="Tags of the SourceDocument")
    metadata: List[SourceDocumentMetadataRead] = Field(
        description="Metadata of the SourceDocument"
    )


class SourceDocumentCreate(SourceDocumentBaseDTO):
    pass
