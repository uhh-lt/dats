import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, validator

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.dto_base import UpdateDTOBase
from app.core.data.dto.preprocessing_job_payload import (
    PreprocessingJobPayloadCreate,
    PreprocessingJobPayloadCreateWithoutPreproJobId,
    PreprocessingJobPayloadRead,
)


# Properties shared across all DTOs
class PreprocessingJobBaseDTO(BaseModel):
    pass


# Properties to create
class PreprocessingJobCreate(PreprocessingJobBaseDTO):
    id: str = Field(
        description="ID of the PreprocessingJob",
        default_factory=lambda: str(uuid.uuid4()),
    )
    status: BackgroundJobStatus = Field(
        default=BackgroundJobStatus.WAITING,
        description="Status of the PreprocessingJob",
    )
    project_id: int = Field(description="The ID of the Project.")
    payloads: List[PreprocessingJobPayloadCreateWithoutPreproJobId] = Field(
        description=(
            "Payloads of the PreprocessingJobs, i.e., documents to be "
            "preprocessed and imported to the project within this PreprocessingJob"
        )
    )

    @validator("payloads", pre=True)
    def payload_must_contain_at_least_one_doc(
        cls, v: List[PreprocessingJobPayloadCreate]
    ) -> List[PreprocessingJobPayloadCreate]:
        assert len(v) >= 1, "Payloads must contain at least one document!"
        return v


# Properties to update
class PreprocessingJobUpdate(PreprocessingJobBaseDTO, UpdateDTOBase):
    status: Optional[BackgroundJobStatus] = Field(
        description="The current status of the payload.",
        default=None,
    )


# Properties to read
class PreprocessingJobRead(PreprocessingJobBaseDTO):
    id: str = Field(description="UUID of the PreprocessingJob")
    status: BackgroundJobStatus = Field(
        default=BackgroundJobStatus.WAITING,
        description="Status of the PreprocessingJob",
    )
    project_id: int = Field(description="The ID of the Project.")
    created: datetime = Field(description="Created timestamp of the PreprocessingJob")
    updated: datetime = Field(description="Updated timestamp of the PreprocessingJob")
    payloads: List[PreprocessingJobPayloadRead] = Field(
        description=(
            "Payloads of the PreprocessingJobs, i.e., documents to be "
            "preprocessed and imported to the project within this PreprocessingJob"
        )
    )

    @validator("payloads")
    def payloads_always_same_order(
        cls, v: List[PreprocessingJobPayloadRead]
    ) -> List[PreprocessingJobPayloadRead]:
        return sorted(v, key=lambda payload: payload.filename)

    class Config:
        orm_mode = True
