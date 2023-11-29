from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.data.dto.dto_base import UpdateDTOBase
from app.util.color import get_next_color


# Properties shared across all DTOs
class DocumentTagBaseDTO(BaseModel):
    title: str = Field(description="Title of the DocumentTag")
    description: Optional[str] = Field(
        description="Description of the DocumentTag", default=None
    )
    color: str = Field(description="Color of the Code")


# Properties for creation
class DocumentTagCreate(DocumentTagBaseDTO):
    project_id: int = Field(description="Project the DocumentTag belongs to")
    color: Optional[str] = Field(
        description="Color of the Code", default_factory=get_next_color
    )


# Properties for updating
class DocumentTagUpdate(DocumentTagBaseDTO, UpdateDTOBase):
    title: Optional[str] = Field(description="Title of the DocumentTag", default=None)
    color: Optional[str] = Field(description="Color of the Code", default_factory=None)


# Properties for reading (as in ORM)
class DocumentTagRead(DocumentTagBaseDTO):
    id: int = Field(description="ID of the DocumentTag")
    project_id: int = Field(description="Project the DocumentTag belongs to")
    created: datetime = Field(description="Created timestamp of the DocumentTag")
    updated: datetime = Field(description="Updated timestamp of the DocumentTag")
    model_config = ConfigDict(from_attributes=True)


# To link a SourceDocument with a DocumentTag
class SourceDocumentDocumentTagLink(BaseModel):
    source_document_id: int = Field(description="ID of the SourceDocument")
    document_tag_id: int = Field(description="ID of the DocumentTag")


# To link multiple SourceDocuments with multiple DocumentTag
class SourceDocumentDocumentTagMultiLink(BaseModel):
    source_document_ids: List[int] = Field(description="List of IDs of SourceDocuments")
    document_tag_ids: List[int] = Field(description="List of IDs of DocumentTags")
