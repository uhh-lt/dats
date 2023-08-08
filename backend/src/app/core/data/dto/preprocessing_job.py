from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, PrivateAttr, validator

from app.core.data.doc_type import DocType


class PreprocessingJobStatus(str, Enum):
    INIT = "INIT"
    IN_PROGRESS = "IN PROGRESS"
    DONE = "DONE"
    FAILED = "FAILED"


class PreprocessingJobPayload(BaseModel):
    project_id: int = Field(description="The ID of the Project.")
    filename: Path = Field(
        description="The filename of the document to be preprocessed."
    )
    mime_type: str = Field(description="The MIME type of the file.")
    doc_type: DocType = Field(description="The DocType of the file.")
    # TODO rename SDocStatus and move to this file!
    status: SDocStatus = Field(
        description="The status of the payload in the preprocessing pipeline.",
        default=SDocStatus.init,
    )


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
    payloads: Optional[List[PreprocessingJobPayload]] = Field(
        default=None,
        description="Payloads of the PreprocessingJobs, i.e., documents to be preprocessed and imported to the project within this PreprocessingJob",
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

    _fn_to_payload_idx: Dict[str, int] = PrivateAttr(default_factory=dict)

    def __init__(self, **data):
        super().__init__(**data)

        self._fn_to_payload_idx = {
            v.filename.name: k for k, v in dict(enumerate(self.payloads)).items()
        }

    def update_payload(
        self, payload: PreprocessingJobPayload
    ) -> PreprocessingJobUpdate:
        pl_idx = self._fn_to_payload_idx.get(payload.filename.name, None)
        if pl_idx is None:
            KeyError(
                f"There exists no PreprocessingJobPayload for the file {payload.filename.name}"
            )
        self.payloads[pl_idx] = payload

        return PreprocessingJobUpdate(status=self.status, payloads=self.payloads)
