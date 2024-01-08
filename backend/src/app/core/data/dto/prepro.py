from typing import List

from pydantic import BaseModel, Field


class PreProProjectStatus(BaseModel):
    project_id: int = Field(
        description="Project ID this PreProProjectStatus refers to."
    )
    active_prepro_job_ids: List[str] = Field(
        description="List of active PreprocessingJob UUIDs", default_factory=lambda: []
    )
    num_active_prepro_job_payloads: int = Field(
        description="Number of active PreprocessingJobPayloads"
    )
    erroneous_prepro_job_payload_ids: List[str] = Field(
        description="List of erroneous or aborted PreprocessingJobPayload UUIDs"
    )
    num_sdocs_finished: int = Field(
        description="Number of SourceDocuments preprocessing has finished."
    )
    num_sdocs_total: int = Field(description="Number of total SourceDocuments.")
