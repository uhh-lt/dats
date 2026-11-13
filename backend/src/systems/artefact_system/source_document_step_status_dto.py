from pydantic import BaseModel, Field

from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus


# Properties for creation
class SourceDocumentStepStatusCreate(BaseModel):
    sdoc_id: int = Field(description="ID of the SourceDocument")
    step: JobType = Field(description="The pipeline step")
    status: SDocStatus = Field(description="Status of the step")
