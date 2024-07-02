from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.dto_base import UpdateDTOBase


class ImportJobParameters(BaseModel):
    proj_id: int = Field(description="ID of the Project")
    user_id: int = Field(description="ID of the User, who started the job.")
    filename: str = Field(description="Filename of the csv or zip of csvs.")


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
