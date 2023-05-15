from datetime import datetime

from pydantic import BaseModel, Field

from app.core.data.dto.dto_base import UpdateDTOBase


# Properties shared across all DTOs
class AnnotationDocumentBaseDTO(BaseModel):
    source_document_id: int = Field(
        description="SourceDocument the AnnotationDocument relates to"
    )
    user_id: int = Field(description="User the AnnotationDocument belongs to")


# Properties for creation
class AnnotationDocumentCreate(AnnotationDocumentBaseDTO):
    pass


# Properties for updating
class AnnotationDocumentUpdate(BaseModel, UpdateDTOBase):
    updated: datetime = Field(description="Updated timestamp of the AnnotationDocument")


# Properties for reading (as in ORM)
class AnnotationDocumentRead(AnnotationDocumentBaseDTO):
    id: int = Field(description="ID of the AnnotationDocument")
    created: datetime = Field(description="Created timestamp of the AnnotationDocument")
    updated: datetime = Field(description="Updated timestamp of the AnnotationDocument")

    class Config:
        orm_mode = True
