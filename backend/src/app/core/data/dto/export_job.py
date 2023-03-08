from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field
from enum import Enum

from app.core.data.dto.dto_base import UpdateDTOBase


class ExportJobStatus(str, Enum):
    INIT = 'init'
    IN_PROGRESS = 'in_progress'
    DONE = 'done'


# Properties shared across all DTOs
class ExportJobBaseDTO(BaseModel):
    status: ExportJobStatus = Field(default=ExportJobStatus.INIT, description='Status of the ExportJob')
    results_url: Optional[str] = Field(default=None, description='URL to download the results when done.')


# Properties to create
class ExportJobCreate(ExportJobBaseDTO):
    description: str = Field(description='Job description')


# Properties to update
class ExportJobUpdate(ExportJobBaseDTO, UpdateDTOBase):
    status: Optional[ExportJobStatus] = Field(default=None, description='Status of the ExportJob')
    results_url: Optional[str] = Field(default=None, description='URL to download the results when done.')


# Properties to read
class ExportJobRead(ExportJobBaseDTO):
    id: str = Field(description='ID of the ExportJob')
    description: str = Field(description='Job description')
    created: datetime = Field(description="Created timestamp of the ExportJob")
