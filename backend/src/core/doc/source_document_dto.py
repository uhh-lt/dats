from datetime import datetime
from enum import Enum
from typing import Optional

from common.doc_type import DocType
from pydantic import BaseModel, ConfigDict, Field
from repos.db.dto_base import UpdateDTOBase

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
    name: Optional[str] = Field(
        description="User-defined name of the document (default is the filename)",
        default=None,
    )
    folder_id: Optional[int] = Field(
        description="ID of the Folder this SourceDocument belongs to", default=None
    )


# Properties for reading (as in ORM)
class SourceDocumentRead(SourceDocumentBaseDTO):
    id: int = Field(description="ID of the SourceDocument")
    created: datetime = Field(description="The created timestamp of the SourceDocument")
    updated: datetime = Field(description="Updated timestamp of the SourceDocument")
    folder_id: int = Field(
        description="ID of the Folder this SourceDocument belongs to"
    )

    model_config = ConfigDict(from_attributes=True)


class SourceDocumentCreate(SourceDocumentBaseDTO):
    folder_id: Optional[int] = Field(
        description="ID of the Folder this SourceDocument belongs to. If not provided, a folder with the filename of the SourceDocument will be created automatically.",
        default=None,
    )
