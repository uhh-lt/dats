from datetime import datetime

from pydantic import BaseModel, Field


# Properties shared across all DTOs
class AnnotationDocumentBaseDTO(BaseModel):
    source_document_id: int = Field(description='SourceDocument the AnnotationDocument relates to')
    user_id: int = Field(description='User the AnnotationDocument belongs to')


# Properties for creation
class AnnotationDocumentCreate(AnnotationDocumentBaseDTO):
    pass


# Properties for updating
# Flo: We do not want to update AnnotationDocuments manually
# class AnnotationDocumentUpdate(AnnotationDocumentBaseDTO):
#     pass


# Properties for reading (as in ORM)
class AnnotationDocumentRead(AnnotationDocumentBaseDTO):
    id: int = Field(description='ID of the AnnotationDocument')
    created: datetime = Field(description="Created timestamp of the AnnotationDocument")
    updated: datetime = Field(description="Updated timestamp of the AnnotationDocument")

    class Config:
        orm_mode = True