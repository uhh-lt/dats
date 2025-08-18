from datetime import datetime
from enum import IntEnum

from pydantic import BaseModel, ConfigDict, Field
from repos.db.dto_base import UpdateDTOBase


class JobType(IntEnum):
    QUOTATION_ATTRIBUTION = 100
    COREFERENCE_RESOLUTION = 101
    DOCUMENT_EMBEDDING = 102
    SENTENCE_EMBEDDING = 103


class JobStatus(IntEnum):
    UNQUEUED = 0  # (not queued/planned)
    WAITING = 1  # (not started yet)
    RUNNING = 2  # (currently in progress)
    FINISHED = 3  # (successfully finished)
    ERROR = 4  # (failed to finish)
    ABORTED = 5  # (aborted by user)


class SourceDocumentJobStatusBaseDTO(BaseModel):
    id: int = Field(description="ID of the SourceDocument")
    type: JobType = Field(description="Type of the job")
    status: JobStatus = Field(description="Status of the job")
    timestamp: datetime | None = Field(
        description="timestamp when quotation attribution was performed on this document"
    )


class SourceDocumentJobStatusRead(SourceDocumentJobStatusBaseDTO):
    model_config = ConfigDict(from_attributes=True)


class SourceDocumentJobStatusCreate(SourceDocumentJobStatusBaseDTO):
    pass


class SourceDocumentJobStatusUpdate(SourceDocumentJobStatusBaseDTO, UpdateDTOBase):
    pass
