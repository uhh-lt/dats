from datetime import datetime
from typing import Optional

from modules.ml.source_document_job_status_orm import JobStatus, JobType
from pydantic import BaseModel, ConfigDict, Field
from repos.db.dto_base import UpdateDTOBase


class SourceDocumentJobStatusBaseDTO(BaseModel):
    id: int = Field(description="ID of the SourceDocument")
    type: JobType = Field(description="Type of the job")
    status: JobStatus = Field(description="Status of the job")
    timestamp: Optional[datetime] = Field(
        description="timestamp when quotation attribution was performed on this document"
    )


class SourceDocumentJobStatusRead(SourceDocumentJobStatusBaseDTO):
    model_config = ConfigDict(from_attributes=True)


class SourceDocumentJobStatusCreate(SourceDocumentJobStatusBaseDTO):
    pass


class SourceDocumentJobStatusUpdate(SourceDocumentJobStatusBaseDTO, UpdateDTOBase):
    pass
