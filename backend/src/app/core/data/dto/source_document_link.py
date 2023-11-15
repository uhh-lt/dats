from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SourceDocumentLinkBase(BaseModel):
    parent_source_document_id: Optional[int] = Field(
        description="ID of the parent SourceDocument."
    )
    linked_source_document_filename: str = Field(
        description="The filename of the linked SourceDocument."
    )


class SourceDocumentLinkCreate(SourceDocumentLinkBase):
    linked_source_document_id: Optional[int] = Field(
        description="ID of the linked SourceDocument.",
        default=None,
    )


class SourceDocumentLinkRead(SourceDocumentLinkBase):
    id: int = Field(description="ID of the SourceDocumentLink")
    parent_source_document_id: int = Field(
        description="ID of the parent SourceDocument."
    )
    linked_source_document_id: int = Field(
        description="ID of the linked SourceDocument."
    )
    model_config = ConfigDict(from_attributes=True)
