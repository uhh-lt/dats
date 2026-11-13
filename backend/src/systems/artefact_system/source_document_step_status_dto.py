from pydantic import BaseModel, Field

from common.sdoc_status_enum import SDocStatus


# Properties for creation
class SourceDocumentStepStatusCreate(BaseModel):
    sdoc_id: int = Field(description="ID of the SourceDocument")
    step: str = Field(description="The pipeline step")
    status: SDocStatus = Field(description="Status of the step")
