from common.job_type import JobType
from core.doc.source_document_status_crud import crud_sdoc_status
from core.doc.source_document_status_dto import SourceDocumentStatusUpdate
from loguru import logger
from modules.doc_image_processing.image_sdoc_job import ImageSdocJobInput
from modules.doc_processing.text_init_job import TextInitJobInput, TextInitJobOutput
from modules.doc_text_processing.html_extraction_job import (
    ExtractHTMLJobInput,
    ExtractHTMLJobOutput,
)
from pydantic import BaseModel
from repos.db.sql_repo import SQLRepo
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
            job_type=JobType.EXTRACT_HTML,
            payload=ExtractHTMLJobInput(
                project_id=input.project_id,
                sdoc_id=output.sdoc_id,
                filepath=input.filepath,
            ),
        )


def handle_job_finished(
    job_type: JobType, input: JobInputBase, output: BaseModel | None
):
    sdoc_id = None
    if hasattr(input, "sdoc_id"):
        sdoc_id = getattr(input, "sdoc_id")
    elif hasattr(output, "sdoc_id"):
        sdoc_id = getattr(output, "sdoc_id")
    if sdoc_id is not None:
        kwargs = {job_type.value: True}
        with SQLRepo().db_session() as db:
            crud_sdoc_status.update(
                db=db,
                id=sdoc_id,
                update_dto=SourceDocumentStatusUpdate(**kwargs),
            )

    match job_type:
        case JobType.TEXT_INIT:
            assert isinstance(input, TextInitJobInput), "Input must be TextInitJobInput"
            assert isinstance(output, TextInitJobOutput), (
                "Output must be TextInitJobOutput"
            )
            logger.info(f"Text initialization completed for {input.filepath.name}")
            js.start_job(
                job_type=JobType.EXTRACT_HTML,
                payload=ExtractHTMLJobInput(
                    project_id=input.project_id,
                    sdoc_id=output.sdoc_id,
                    filepath=input.filepath,
                ),
            )
        case JobType.EXTRACT_HTML:
            assert isinstance(input, ExtractHTMLJobInput), (
                "Input must be ExtractHTMLJobInput"
            )
            assert isinstance(output, ExtractHTMLJobOutput), (
                "Output must be TextInitJobOutput"
            )
            assert sdoc_id is not None, "sdoc_id must be set"
            logger.info(f"Text initialization completed for {input.filepath.name}")
            js.start_job(
                job_type=JobType.EXTRACT_HTML,
                payload=ExtractHTMLJobInput(
                    project_id=input.project_id,
                    sdoc_id=sdoc_id,
                    filepath=input.filepath,
                ),
            )
            # FIXME: create folder... in EXTRACT_HTML job?
            folder_id = -1
            for path in output.image_paths:
                js.start_job(
                    job_type=JobType.IMAGE_SDOC,
                    payload=ImageSdocJobInput(
                        project_id=input.project_id,
                        filepath=path,
                        folder_id=folder_id,
                    ),
                )
