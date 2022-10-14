from datetime import datetime
from enum import Enum
from typing import List, Tuple, Optional

from pydantic import BaseModel, Field

from app.core.data.doc_type import DocType
from app.core.data.dto.util import PaginatedResults


class SDocStatus(int, Enum):
    undefined_or_erroneous = -1  # "undefined_or_erroneous"
    imported_uploaded_text_document = 0  # "imported uploaded text document"
    imported_uploaded_image_document = 1  # "imported uploaded image document"
    generated_automatic_span_annotations = 2  # "generated automatic span annotations"
    persisted_automatic_span_annotations = 3  # "persisted automatic span annotations"
    generated_automatic_bbox_annotations = 4  # "generated automatic bbox annotations"
    persisted_automatic_bbox_annotations = 5  # "persisted automatic bbox annotations"
    generated_automatic_image_captions = 6  # "generated automatic image captions"
    created_pptds_from_automatic_caption = 7  # "created pptds from automatic caption"
    added_document_to_elasticsearch_index = 8  # "added document to elasticsearch index"
    added_document_to_faiss_index = 9  # "added document to faiss index"
    finished = 9  # "added document to faiss index"


"""
 TODO Flo: 
 Because we"re not storing the content in the SQL DB but only in the ES instance we handle this differently
  than in other DTOs.
"""


# Properties shared across all DTOs
class SourceDocumentBaseDTO(BaseModel):
    filename: str = Field(description="Filename of the SourceDocument")
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


class PaginatedSourceDocumentReads(PaginatedResults):
    sdocs: List[SourceDocumentRead] = Field(description="The SourceDocuments on this page")


class SourceDocumentContent(BaseModel):
    source_document_id: int = Field(description="ID of the SourceDocument the content belongs to.")
    content: str = Field(description="The (textual) content of the SourceDocument the content belongs to.")


class SourceDocumentTokens(BaseModel):
    source_document_id: int = Field(description="ID of the SourceDocument the Tokens belong to.")
    tokens: List[str] = Field(description="The (textual) list Tokens of the SourceDocument the Tokens belong to.")
    token_character_offsets: Optional[List[Tuple[int, int]]] = Field(description=("The list of character offsets of"
                                                                                  " the Tokens"),
                                                                     default=None)


class SourceDocumentKeywords(BaseModel):
    source_document_id: int = Field(description="ID of the SourceDocument the Keywords belong to.")
    keywords: List[str] = Field(description="The list of Keywords of the SourceDocument the Keywords belong to.")
