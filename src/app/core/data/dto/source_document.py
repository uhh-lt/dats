from datetime import datetime
from typing import List, Tuple, Optional

from pydantic import BaseModel, Field

from app.core.data.doc_type import DocType

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

    class Config:
        orm_mode = True


class SourceDocumentContent(BaseModel):
    source_document_id: int = Field(description="ID of the SourceDocument")
    content: str = Field(description="The (textual) content of the SourceDocument")


class SourceDocumentTokens(BaseModel):
    source_document_id: int = Field(description="ID of the SourceDocument")
    tokens: List[str] = Field(description="The (textual) list Tokens of the SourceDocument")
    token_character_offsets: Optional[List[Tuple[int, int]]] = Field(description=("The list of character offsets of"
                                                                                  " the Tokens"),
                                                                     default=None)
