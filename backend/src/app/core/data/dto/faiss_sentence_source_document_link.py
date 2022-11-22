from pydantic import BaseModel, Field


class FaissSentenceSourceDocumentLinkBase(BaseModel):
    source_document_id: int = Field(description="ID of the SourceDocument.")
    sentence_id: int = Field(description="ID of the sentence in the SourceDocument.")


class FaissSentenceSourceDocumentLinkCreate(FaissSentenceSourceDocumentLinkBase):
    pass


class FaissSentenceSourceDocumentLinkRead(FaissSentenceSourceDocumentLinkBase):
    id: int = Field(description="ID of the FaissSentenceSourceDocumentLink")
