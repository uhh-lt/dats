from datetime import datetime
from enum import Enum
from typing import List, Optional, Tuple

from app.core.data.doc_type import DocType
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataRead
from app.core.data.dto.util import PaginatedResults
from pydantic import BaseModel, Field

SDOC_FILENAME_MAX_LENGTH = 200
SDOC_SUFFIX_MAX_LENGTH = 30


class SDocStatus(str, Enum):
    unfinished_or_erroneous = "unfinished_or_erroneous"
    index_image_document_in_faiss = (
        "index_image_document_in_faiss"  # "added document to faiss index"
    )
    index_text_document_in_faiss = (
        "index_text_document_in_faiss"  # "added document to faiss index"
    )
    finished = "finished"  # "added document to faiss index"


"""
 TODO Flo:
 Because we"re not storing the content in the SQL DB but only in the ES instance
  we handle this differently than in other DTOs.
"""


# Properties shared across all DTOs
class SourceDocumentBaseDTO(BaseModel):
    filename: str = Field(
        description="Filename of the SourceDocument",
        max_length=SDOC_FILENAME_MAX_LENGTH + SDOC_SUFFIX_MAX_LENGTH,
    )
    content: str = Field(description="Content of the SourceDocument")
    doctype: DocType = Field(description="DOCTYPE of the SourceDocument")
    status: SDocStatus = Field(description="Status of the SourceDocument")
    project_id: int = Field(description="Project the SourceDocument belongs to")


# Properties for creation
# Flo: Since we"re uploading a file we have to use multipart/form-data directily in the router method
class SourceDocumentCreate(SourceDocumentBaseDTO):
    pass


# Properties for updating
# Flo: We do not want to update SourceDocuments
# class SourceDocumentUpdate(SourceDocumentBaseDTO):
#     pass


# Properties for reading (as in ORM)
class SourceDocumentRead(SourceDocumentBaseDTO):
    id: int = Field(description="ID of the SourceDocument")
    created: datetime = Field(description="The created timestamp of the SourceDocument")
    updated: datetime = Field(description="Updated timestamp of the Memo")

    class Config:
        orm_mode = True


class SourceDocumentReadAction(SourceDocumentRead):
    tags: List[DocumentTagRead] = Field(description="Tags of the SourceDocument")
    metadata: List[SourceDocumentMetadataRead] = Field(
        description="Metadata of the SourceDocument"
    )


class PaginatedSourceDocumentReads(PaginatedResults):
    sdocs: List[SourceDocumentRead] = Field(
        description="The SourceDocuments on this page"
    )


class SourceDocumentContent(BaseModel):
    source_document_id: int = Field(
        description="ID of the SourceDocument the content belongs to."
    )
    content: str = Field(
        description="The (textual) content of the SourceDocument the content belongs to."
    )


class SourceDocumentHTML(BaseModel):
    source_document_id: int = Field(
        description="ID of the SourceDocument the content belongs to."
    )
    html: str = Field(description="The (html) content of the SourceDocument.")


class SourceDocumentTokens(BaseModel):
    source_document_id: int = Field(
        description="ID of the SourceDocument the Tokens belong to."
    )
    tokens: List[str] = Field(
        description="The (textual) list Tokens of the SourceDocument the Tokens belong to."
    )
    token_character_offsets: Optional[List[Tuple[int, int]]] = Field(
        description=("The list of character offsets of" " the Tokens"),
        default=None,
    )


class SourceDocumentSentences(BaseModel):
    source_document_id: int = Field(
        description="ID of the SourceDocument the Sentences belong to."
    )
    sentences: List[str] = Field(
        description="The Sentences of the SourceDocument the Sentences belong to."
    )
    sentence_character_offsets: Optional[List[Tuple[int, int]]] = Field(
        description=("The list of character offsets of" " the Sentences"),
        default=None,
    )


class SourceDocumentKeywords(BaseModel):
    source_document_id: int = Field(
        description="ID of the SourceDocument the Keywords belong to."
    )
    keywords: List[str] = Field(
        description="The list of Keywords of the SourceDocument the Keywords belong to."
    )
