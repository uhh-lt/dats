from loguru import logger
from modules.doc_processing.text_init_job import TextInitJobInput, TextInitJobOutput
from modules.doc_text_processing.html_extraction_job import ExtractHTMLJobInput
from pydantic import BaseModel
from systems.event_system.events import job_finished
from systems.job_system.job_dto import JobInputBase
from systems.job_system.job_service import JobService

js = JobService()


@job_finished.connect
def job_finished_handler(
    sender, job_type: str, input: JobInputBase, output: BaseModel | None
):
    logger.info(f"Job finished: {job_type}, Input: {input}, Output: {output}")

    if job_type == "text_init":
        assert isinstance(input, TextInitJobInput), "Input must be TextInitJobInput"
        assert isinstance(output, TextInitJobOutput), "Output must be TextInitJobOutput"
        logger.info(f"Text initialization completed for {input.filepath.name}")
        js.start_job(
            job_type="extract_html",
            payload=ExtractHTMLJobInput(
                project_id=input.project_id,
                sdoc_id=output.sdoc_id,
                filepath=input.filepath,
            ),
        )
