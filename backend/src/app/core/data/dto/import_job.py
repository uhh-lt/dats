from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from app.core.data.dto.background_job_base import BackgroundJobStatus


class ImportJobType(str, Enum):
    PROJECT = "PROJECT"
    CODES = "CODES"
    TAGS = "TAGS"
    BBOX_ANNOTATIONS = "BBOX_ANNOTATIONS"
    SPAN_ANNOTATIONS = "SPAN_ANNOTATIONS"
    SENTENCE_ANNOTATIONS = "SENTENCE_ANNOTATIONS"
    USERS = "USERS"
    PROJECT_METADATA = "PROJECT_METADATA"
    WHITEBOARDS = "WHITEBOARDS"
    TIMELINE_ANALYSES = "TIMELINE_ANALYSES"
    COTA = "COTA"


class ImportJobParameters(BaseModel):
    import_job_type: ImportJobType = Field(
        description="The type of the import job (what to import)"
    )
    project_id: int = Field(description="ID of the Project")
    user_id: int = Field(description="ID of the User, who started the job.")
    file_name: str = Field(
        description="The name to the file that is used for the import job"
    )


class ImportJobBase(BaseModel):
    status: BackgroundJobStatus = Field(
        default=BackgroundJobStatus.WAITING, description="Status of the ImportJob"
    )
    error: Optional[str] = Field(default=None, description="Error message (if any)")


class ImportJobRead(ImportJobBase):
    id: str = Field(description="ID of the ImportJob")
    created: datetime = Field(description="Created timestamp of the ImportJob")
    updated: datetime = Field(description="Updated timestamp of the ImportJob")
    parameters: ImportJobParameters = Field(
        description="The parameters of the import job that defines what to import!"
    )


class ImportJobCreate(ImportJobBase):
    parameters: ImportJobParameters = Field(
        description="The parameters of the import job that defines what to import!"
    )


class ImportJobUpdate(ImportJobBase):
    pass
