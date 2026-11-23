from datetime import datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field

from common.doc_type_enum import DocType
from core.doc.folder_dto import FolderRead
from repos.db.dto_base import UpdateDTOBase

SDOC_FILENAME_MAX_LENGTH = 200
SDOC_SUFFIX_MAX_LENGTH = 30


# Properties shared across all DTOs
class SourceDocumentBaseDTO(BaseModel):
    filename: str = Field(
        description="Filename of the SourceDocument",
        max_length=SDOC_FILENAME_MAX_LENGTH + SDOC_SUFFIX_MAX_LENGTH,
    )
    name: str = Field(
        description="User-defined name of the document (default is the filename)"
    )
    doctype: DocType = Field(description="DOCTYPE of the SourceDocument")
    project_id: int = Field(description="Project the SourceDocument belongs to")


# Properties for updating
class SourceDocumentUpdate(BaseModel, UpdateDTOBase):
    # NOT NULL columns: omit to keep the value, an explicit null is rejected.
    non_nullable_fields: ClassVar[frozenset[str]] = frozenset({"name", "folder_id"})

    name: str | None = Field(
        description="User-defined name of the document (default is the filename)",
        default=None,
    )
    folder_id: int | None = Field(
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
    memo_ids: list[int] = Field(
        description="IDs of the Memos attached to the SourceDocument",
        default_factory=list,
    )

    model_config = ConfigDict(from_attributes=True)


class SourceDocumentDeleteResult(BaseModel):
    sdocs: list[SourceDocumentRead] = Field(
        description="The deleted SourceDocuments, in the order of the requested IDs"
    )
    folders: list[FolderRead] = Field(
        description="The SDOC_FOLDERs that were deleted because they became empty"
    )


class SourceDocumentUrls(BaseModel):
    """The URLs of the files of a SourceDocument, relative to the content
    server (`/content/`)."""

    file_url: str = Field(description="URL of the uploaded file of the SourceDocument")
    image_url: str | None = Field(
        description="URL of the WebP image of an image SourceDocument (None until it is computed)"
    )
    thumbnail_url: str | None = Field(
        description="URL of the thumbnail of an image or video SourceDocument (None until it is computed)"
    )


class SourceDocumentCreate(SourceDocumentBaseDTO):
    folder_id: int | None = Field(
        description="ID of the Folder this SourceDocument belongs to. If not provided, a folder with the filename of the SourceDocument will be created automatically.",
        default=None,
    )
