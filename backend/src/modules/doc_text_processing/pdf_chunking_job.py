from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobPriority,
)
from systems.job_system.job_register_decorator import register_job


class PDFChunkingJobInput(JobInputBase):
    sdoc_id: int
    filename: str | None
    text: str | None


@register_job(
    job_type="pdf_chunking",
    input_type=PDFChunkingJobInput,
    output_type=None,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.NONE,
)
def handle_pdf_chunking_job(payload: PDFChunkingJobInput, job: Job) -> None:
    # TODO: Macht das sinn?
    pass
