from pydantic import BaseModel, Field


class SourceDocumentLinkBase(BaseModel):
    parent_source_document_id: int = Field(description="ID of the parent SourceDocument.")
    linked_source_document_filename: str = Field(description="The filename of the linked SourceDocument.")


class SourceDocumentLinkCreate(SourceDocumentLinkBase):
    pass


class SourceDocumentLinkRead(SourceDocumentLinkBase):
    id: int = Field(description="ID of the SourceDocumentLink")
    linked_source_document_id: int = Field(description="ID of the linked SourceDocument.")

    class Config:
        orm_mode = True
