import uuid
from datetime import datetime

from preprocessing.preprocessing_job_payload_dto import (
    PreprocessingJobPayloadCreate,
    PreprocessingJobPayloadCreateWithoutPreproJobId,
    PreprocessingJobPayloadRead,
)
from pydantic import BaseModel, ConfigDict, Field, field_validator
from repos.db.dto_base import UpdateDTOBase
from systems.job_system.background_job_base_dto import BackgroundJobStatus


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
    payloads: list[PreprocessingJobPayloadCreateWithoutPreproJobId] = Field(
        description=(
            "Payloads of the PreprocessingJobs, i.e., documents to be "
            "preprocessed and imported to the project within this PreprocessingJob"
        )
    )

    @field_validator("payloads", mode="before")
    def payload_must_contain_at_least_one_doc(
        cls, v: list[PreprocessingJobPayloadCreate]
    ) -> list[PreprocessingJobPayloadCreate]:
        assert len(v) >= 1, "Payloads must contain at least one document!"
        return v


# Properties to update
class PreprocessingJobUpdate(PreprocessingJobBaseDTO, UpdateDTOBase):
    status: BackgroundJobStatus | None = Field(
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
    payloads: list[PreprocessingJobPayloadRead] = Field(
        description=(
            "Payloads of the PreprocessingJobs, i.e., documents to be "
            "preprocessed and imported to the project within this PreprocessingJob"
        )
    )
    model_config = ConfigDict(from_attributes=True)

    @field_validator("payloads")
    def payloads_always_same_order(
        cls, v: list[PreprocessingJobPayloadRead]
    ) -> list[PreprocessingJobPayloadRead]:
        return sorted(v, key=lambda payload: payload.filename)
