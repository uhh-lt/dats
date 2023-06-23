from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, validator

from app.core.data.doc_type import DocType
from app.core.data.dto.dto_base import UpdateDTOBase


class PreprocessingJobStatus(str, Enum):
    INIT = "INIT"
    IN_PROGRESS = "IN PROGRESS"
    DONE = "DONE"
    FAILED = "FAILED"


class PreprocessingJobPayload(BaseModel):
    file_path: Path = Field(
        description="The filepath of the document to be preprocessed."
    )
    mime_type: str = Field(description="The MIME type of the file.")
    doc_type: DocType = Field(description="The DocType of the file.")


# Properties shared across all DTOs
class PreprocessingJobBaseDTO(BaseModel):
    status: PreprocessingJobStatus = Field(
        default=PreprocessingJobStatus.INIT,
        description="Status of the PreprocessingJob",
    )


# Properties to create
class PreprocessingJobCreate(PreprocessingJobBaseDTO):
    project_id: int = Field(
        description="The ID of the Project for which the PreprocessingJob is executed."
    )
    payloads: List[PreprocessingJobPayload] = Field(
        description="Payloads of the PreprocessingJobs, i.e., documents to be preprocessed and imported to the project within this PreprocessingJob"
    )

    @validator("payloads", pre=True)
    def payload_must_contain_at_least_one_doc(cls, v):
        assert len(v) >= 1, "Payloads must contain at least one document!"
        return v


# Properties to update
class PreprocessingJobUpdate(PreprocessingJobBaseDTO, UpdateDTOBase):
    status: Optional[PreprocessingJobStatus] = Field(
        default=None, description="Status of the PreprocessingJob"
    )


# Properties to read
class PreprocessingJobRead(PreprocessingJobBaseDTO):
    id: str = Field(description="ID of the PreprocessingJob")
    project_id: int = Field(
        description="The ID of the Project for which the PreprocessingJob is executed."
    )
    payloads: List[PreprocessingJobPayload] = Field(
        description="Payloads of the PreprocessingJobs, i.e., documents to be preprocessed and imported to the project within this PreprocessingJob"
    )
    created: datetime = Field(description="Created timestamp of the PreprocessingJob")
    updated: datetime = Field(description="Updated timestamp of the PreprocessingJob")
