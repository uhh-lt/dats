import uuid
from typing import Optional

from common.doc_type import DocType
from pydantic import BaseModel, ConfigDict, Field
from repos.db.dto_base import UpdateDTOBase
from systems.job_system.background_job_base_dto import BackgroundJobStatus


class PreprocessingJobPayloadBaseDTO(BaseModel):
    pass


class PreprocessingJobPayloadCreateWithoutPreproJobId(PreprocessingJobPayloadBaseDTO):
    id: str = Field(
        description="ID of the PreprocessingJobPayload",
        default_factory=lambda: str(uuid.uuid4()),
    )
    project_id: int = Field(
        description="ID of the Project of the PreprocessingJobPayload"
    )
    status: BackgroundJobStatus = Field(
        description="The current status of the payload.",
        default=BackgroundJobStatus.WAITING,
    )
    filename: str = Field(
        description="The filename of the document to be preprocessed."
    )
    mime_type: str = Field(description="The MIME type of the payload file.")
    doc_type: DocType = Field(description="The DocType of the payload file.")


class PreprocessingJobPayloadCreate(PreprocessingJobPayloadCreateWithoutPreproJobId):
    prepro_job_id: str = Field(
        description="UUID of the PreprocessingJob this payload belongs to."
    )


class PreprocessingJobPayloadUpdate(PreprocessingJobPayloadBaseDTO, UpdateDTOBase):
    status: Optional[BackgroundJobStatus] = Field(
        description="The current status of the payload.",
        default=None,
    )
    current_pipeline_step: Optional[str] = Field(
        description="The current step in the preprocessing pipeline.",
        default=None,
    )
    error_message: Optional[str] = Field(
        description="The error message if the payload failed.",
        default=None,
    )


class PreprocessingJobPayloadRead(PreprocessingJobPayloadBaseDTO):
    id: str = Field(description="ID of the PreprocessingJobPayload")
    prepro_job_id: str = Field(
        description="UUID of the PreprocessingJob this payload belongs to."
    )
    project_id: int = Field(
        description="ID of the Project of the PreprocessingJobPayload"
    )
    source_document_id: Optional[int] = Field(
        description="ID of the SourceDocument that was created from the payload.",
        default=None,
    )

    status: BackgroundJobStatus = Field(
        description="The current status of the payload.",
        default=BackgroundJobStatus.WAITING,
    )
    filename: str = Field(
        description="The filename of the document to be preprocessed."
    )
    mime_type: str = Field(description="The MIME type of the payload file.")
    doc_type: DocType = Field(description="The DocType of the payload file.")
    current_pipeline_step: Optional[str] = Field(
        description="The current step in the preprocessing pipeline.",
        default=None,
    )
    error_message: Optional[str] = Field(
        description="The error message if the payload failed.",
        default=None,
    )
    model_config = ConfigDict(from_attributes=True)
