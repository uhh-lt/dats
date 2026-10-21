from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from modules.ml.ml_enum import MLJobStatus, MLJobTypeID
from repos.db.dto_base import UpdateDTOBase


class SourceDocumentJobStatusBaseDTO(BaseModel):
    id: int = Field(description="ID of the SourceDocument")
    type: MLJobTypeID = Field(description="Type of the job")
    status: MLJobStatus = Field(description="Status of the job")
    timestamp: datetime | None = Field(
        description="timestamp when quotation attribution was performed on this document"
    )


class SourceDocumentJobStatusRead(SourceDocumentJobStatusBaseDTO):
    model_config = ConfigDict(from_attributes=True)


class SourceDocumentJobStatusCreate(SourceDocumentJobStatusBaseDTO):
    pass


class SourceDocumentJobStatusUpdate(SourceDocumentJobStatusBaseDTO, UpdateDTOBase):
    pass
