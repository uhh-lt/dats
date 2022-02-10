from datetime import datetime

from pydantic import BaseModel, Field

"""
 TODO Flo: 
 Because we're not storing the content in the SQL DB but only in the ES instance we handle this differently
  than in other DTOs.
"""

# FIXME Flo: dont do that, use enum!
# TODO Flo: Add image, video, audio, pdf, etc.
DocTypeDict = {
    "text/plain": 1
}


# Properties shared across all DTOs
class SourceDocumentBaseDTO(BaseModel):
    filename: str = Field(description='Filename of the SourceDocument')
    content: str = Field(description='Content of the SourceDocument')
    doctype: int = Field(description='DOCTYPE of the SourceDocument')
    project_id: int = Field(description='Project the SourceDocument belongs to')


# Properties for creation
# Flo: Since we're uploading a file we have to use multipart/form-data directily in the router method
class SourceDocumentCreate(SourceDocumentBaseDTO):
    pass


# Properties for updating
# Flo: We do not want to update SourceDocuments
# class SourceDocumentUpdate(SourceDocumentBaseDTO):
#     pass


# Properties for reading (as in ORM)
class SourceDocumentRead(SourceDocumentBaseDTO):
    id: int = Field(description='ID of the SourceDocument')
    created: datetime = Field(description="The created timestamp of the SourceDocument")

    class Config:
        orm_mode = True
