from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.dto_base import UpdateDTOBase


class ImportJobType(str, Enum):
    SINGLE_PROJECT_ALL_DATA = "SINGLE_PROJECT_ALL_DATA"
    SINGLE_PROJECT_ALL_USER = "SINGLE_PROJECT_ALL_USER"
    SINGLE_PROJECT_ALL_TAGS = "SINGLE_PROJECT_ALL_TAGS"
    SINGLE_PROJECT_SELECTED_SDOCS = "SINGLE_PROJECT_SELECTED_SDOCS"

    SINGLE_USER_ALL_DATA = "SINGLE_USER_ALL_DATA"
    SINGLE_PROJECT_ALL_PROJECT_PROJECT_METADATA = (
        "SINGLE_PROJECT_ALL_PROJECT_PROJECT_METADATA"
    )
    SINGLE_USER_ALL_CODES = "SINGLE_USER_ALL_CODES"
    SINGLE_USER_ALL_MEMOS = "SINGLE_USER_ALL_MEMOS"
    SINGLE_USER_LOGBOOK = "SINGLE_USER_LOGBOOK"

    SINGLE_DOC_ALL_USER_ANNOTATIONS = "SINGLE_DOC_ALL_USER_ANNOTATIONS"
    SINGLE_DOC_SINGLE_USER_ANNOTATIONS = "SINGLE_DOC_SINGLE_USER_ANNOTATIONS"


class ImportJobParameters(BaseModel):
    proj_id: int = Field(description="ID of the Project")
    user_id: int = Field(description="ID of the User, who started the job.")
    filename: str = Field(description="Filename of the csv or zip of csvs.")
    import_job_type: ImportJobType = Field(
        description="The type of the import job (what to import)"
    )


class ImportJobBaseDTO(BaseModel):
    status: BackgroundJobStatus = Field(
        default=BackgroundJobStatus.WAITING, description="Status of the ImportJob"
    )


class ImportJobCreate(ImportJobBaseDTO):
    parameters: ImportJobParameters = Field(
        description="The parameters of the import job that defines what to import!"
    )


class ImportJobRead(ImportJobBaseDTO):
    id: str = Field(description="ID of the ImportJob")
    parameters: ImportJobParameters = Field(
        description="The parameters of the import job that defines what to import!"
    )
    created: datetime = Field(description="Created timestamp of the ImportJob")


class ImportJobUpdate(BaseModel, UpdateDTOBase):
    status: Optional[BackgroundJobStatus] = Field(
        default=None, description="Status of the ImportJob"
    )
