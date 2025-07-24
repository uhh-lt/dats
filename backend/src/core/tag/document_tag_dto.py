from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field
from repos.db.dto_base import UpdateDTOBase
from utils.color_utils import get_next_color


# Properties shared across all DTOs
class DocumentTagBaseDTO(BaseModel):
    name: str = Field(description="Title of the DocumentTag")
    color: str = Field(description="Color of the DocumentTag")
    description: Optional[str] = Field(
        description="Description of the DocumentTag", default=None
    )
    parent_id: Optional[int] = Field(
        description="Parent of the DocumentTag", default=None
    )


# Properties for creation
class DocumentTagCreate(DocumentTagBaseDTO):
    project_id: int = Field(description="Project the DocumentTag belongs to")
    color: str = Field(description="Color of the Code", default_factory=get_next_color)


# Properties for updating
class DocumentTagUpdate(BaseModel, UpdateDTOBase):
    name: Optional[str] = Field(description="Name of the DocumentTag", default=None)
    color: Optional[str] = Field(description="Color of the DocumentTag", default=None)
    description: Optional[str] = Field(
        description="Description of the DocumentTag", default=None
    )
    parent_id: Optional[int] = Field(
        description="Parent of the DocumentTag", default=None
    )


# Properties for reading (as in ORM)
class DocumentTagRead(DocumentTagBaseDTO):
    id: int = Field(description="ID of the DocumentTag")
    project_id: int = Field(description="Project the DocumentTag belongs to")
    created: datetime = Field(description="Created timestamp of the DocumentTag")
    updated: datetime = Field(description="Updated timestamp of the DocumentTag")
    memo_ids: List[int] = Field(description="Memo IDs attached to the DocumentTag")
    model_config = ConfigDict(from_attributes=True)


# To link a SourceDocument with a DocumentTag
class SourceDocumentDocumentTagLink(BaseModel):
    source_document_id: int = Field(description="ID of the SourceDocument")
    document_tag_id: int = Field(description="ID of the DocumentTag")


# To link multiple SourceDocuments with multiple DocumentTag
class SourceDocumentDocumentTagMultiLink(BaseModel):
    source_document_ids: List[int] = Field(description="List of IDs of SourceDocuments")
    document_tag_ids: List[int] = Field(description="List of IDs of DocumentTags")


class SourceDocumentDocumentTagLinks(BaseModel):
    source_document_id: int = Field(description="ID of SourceDocument")
    document_tag_ids: List[int] = Field(description="List of IDs of DocumentTags")
