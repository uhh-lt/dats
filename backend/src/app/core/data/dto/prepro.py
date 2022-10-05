from pydantic import BaseModel, Field

from app.core.data.dto.source_document import SDocStatus


class PreProProjectStatus(BaseModel):
    project_id: int = Field(description='Project ID this PreProProjectStatus refers to.')
    in_progress: bool = Field(description="Flag if Preprocessing is in progress.")
    num_sdocs_in_progress: int = Field(description="Number of SourceDocuments that are getting preprocessed.")
    num_sdocs_finished: int = Field(description="Number of SourceDocuments preprocessing has finished.")


class PreProSDocStatus(BaseModel):
    sdoc_id: int = Field(description='SourceDocument ID this PreProSDocStatus refers to.')
    status: SDocStatus = Field(description="Preprocessing Status of the SourceDocument")
