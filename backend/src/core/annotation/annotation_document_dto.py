from datetime import datetime

from pydantic import BaseModel, Field

from repos.db.dto_base import UpdateDTOBase


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


# Counts the annotations of a user per code in documents (span and sentence
# annotations alike)
class AnnotationCountRequest(BaseModel):
    user_id: int = Field(description="The User whose annotations are counted")
    sdoc_ids: list[int] = Field(description="The SourceDocuments to count in")
    code_ids: list[int] = Field(description="The Codes to count")
