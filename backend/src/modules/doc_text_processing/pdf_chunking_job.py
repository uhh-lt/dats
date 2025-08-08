from common.job_type import JobType
from systems.job_system.job_dto import Job, JobInputBase
from systems.job_system.job_register_decorator import register_job


class PDFChunkingJobInput(JobInputBase):
    sdoc_id: int
    filename: str | None
    text: str | None


@register_job(
    job_type=JobType.PDF_CHECKING,
    input_type=PDFChunkingJobInput,
)
def handle_pdf_chunking_job(payload: PDFChunkingJobInput, job: Job) -> None:
    # TODO: Macht das sinn?
    pass
