from typing import Dict, List, Optional

from app.core.data.doc_type import DocType
from app.core.data.dto.background_job_base import (
    BackgroundJobBase,
    BackgroundJobBaseCreate,
    BackgroundJobBaseRead,
    BackgroundJobBaseUpdate,
    BackgroundJobStatus,
)
from pydantic import BaseModel, Field, PrivateAttr, validator


class PreprocessingJobPayload(BaseModel):
    project_id: int = Field(description="The ID of the Project.")
    filename: str = Field(
        description="The filename of the document to be preprocessed."
    )
    mime_type: str = Field(description="The MIME type of the file.")
    doc_type: DocType = Field(description="The DocType of the file.")

    current_pipeline_step: str = Field(
        description="The current step in the preprocessing pipeline.",
        default="",
    )

    status: BackgroundJobStatus = Field(
        description="The current status of the payload.",
        default=BackgroundJobStatus.WAITING,
    )

    error_message: Optional[str] = Field(
        description="The error message if the payload failed.",
        default=None,
    )


# Properties shared across all DTOs
class PreprocessingJobBaseDTO(BackgroundJobBase):
    pass


# Properties to create
class PreprocessingJobCreate(PreprocessingJobBaseDTO, BackgroundJobBaseCreate):
    payloads: List[PreprocessingJobPayload] = Field(
        description=(
            "Payloads of the PreprocessingJobs, i.e., documents to be "
            "preprocessed and imported to the project within this PreprocessingJob"
        )
    )

    @validator("payloads", pre=True)
    def payload_must_contain_at_least_one_doc(cls, v: List[PreprocessingJobPayload]):
        assert len(v) >= 1, "Payloads must contain at least one document!"
        return v


# Properties to update
class PreprocessingJobUpdate(PreprocessingJobBaseDTO, BackgroundJobBaseUpdate):
    payloads: Optional[List[PreprocessingJobPayload]] = Field(
        default=None,
        description=(
            "Payloads of the PreprocessingJobs, i.e., documents to be "
            "preprocessed and imported to the project within this PreprocessingJob"
        ),
    )


# Properties to read
class PreprocessingJobRead(PreprocessingJobBaseDTO, BackgroundJobBaseRead):
    payloads: List[PreprocessingJobPayload] = Field(
        description=(
            "Payloads of the PreprocessingJobs, i.e., documents to be "
            "preprocessed and imported to the project within this PreprocessingJob"
        )
    )

    _fn_to_payload_idx: Dict[str, int] = PrivateAttr(default_factory=dict)

    def __init__(self, **data):
        super().__init__(**data)

        self._fn_to_payload_idx = {
            v.filename: k for k, v in dict(enumerate(self.payloads)).items()
        }

    def update_payload(
        self, payload: PreprocessingJobPayload
    ) -> PreprocessingJobUpdate:
        pl_idx = self._fn_to_payload_idx.get(payload.filename, None)
        if pl_idx is None:
            KeyError(
                f"There exists no PreprocessingJobPayload for '{payload.filename}'!"
            )
        else:
            self.payloads[pl_idx] = payload

        return PreprocessingJobUpdate(status=self.status, payloads=self.payloads)
