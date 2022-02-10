from datetime import datetime
from enum import Enum
from typing import Optional

from fastapi import UploadFile, File, Form
from pydantic import BaseModel, Field

from .dto_base import ReadDTOBase

"""
 Flo: 
 Because we're not storing the content in the SQL DB but only in the ES instance we handle this differently
  than in other DTOs.
"""


class DocType(str, Enum):
    TEXT = 'TEXT'
    # TODO Flo: Add image, video, audio, pdf, etc.


# Properties shared across all DTOs
class SourceDocumentBaseDTO(BaseModel):
    pass


# Properties for creation
class SourceDocumentCreate(SourceDocumentBaseDTO):
    # Flo: Since we're uploading a file we have to use multipart/form-data
    #  see: https://fastapi.tiangolo.com/tutorial/request-forms-and-files/
    file: UploadFile = File(..., description="The file represented by the SourceDocument")
    # Flo: filename can be set explicitly otherwise implicit from UploadFile
    filename: Optional[str] = Form(description='Filename of the SourceDocument', default=None)
    # TODO Flo: This can and should be implicitly set from UploadFile MIME Type
    doctype: int = Form(..., description='DOCTYPE of the SourceDocument')
    project_id: int = Form(..., description='Project the SourceDocument belongs to')


# Properties for updating
# Flo: We do not want to update SourceDocuments
# class SourceDocumentUpdate(SourceDocumentBaseDTO):
#     pass


# Properties for reading (as in ORM)
class SourceDocumentRead(SourceDocumentBaseDTO):
    id: int = Field(description='ID of the SourceDocument')
    filename: str = Field(description='Filename of the SourceDocument')
    doctype: DocType = Field(description='DOCTYPE of the SourceDocument')
    project_id: int = Field(description='Project the SourceDocument belongs to')
    created: datetime = Field(description="The created timestamp of the SourceDocument")

    class Config:
        orm_mode = True