from datetime import datetime

from app.core.data.dto.dto_base import UpdateDTOBase
from pydantic import BaseModel, Field


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
