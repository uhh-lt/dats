from pathlib import Path

import magic
from common.doc_type import DocType, get_doc_type
from common.job_type import JobType
from loguru import logger
from modules.doc_processing.preprocessing_new_service import (
    UnsupportedDocTypeForMimeType,
)
from pydantic import BaseModel
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job, JobInputBase
from systems.job_system.job_register_decorator import register_job

fsr: FilesystemRepo = FilesystemRepo()


class ArchiveExtractionJobInput(JobInputBase):
    filepath: Path


class ArchiveExtractionJobOutput(BaseModel):
    file_paths: list[Path]
    job_types: list[JobType]


@register_job(
    job_type=JobType.TEXT_INIT,
    input_type=ArchiveExtractionJobInput,
    output_type=ArchiveExtractionJobOutput,
)
def handle_init_text_job(
    payload: ArchiveExtractionJobInput, job: Job
) -> ArchiveExtractionJobOutput:
    paths = FilesystemRepo().extract_archive_in_project(
        payload.project_id, payload.filepath
    )
    job_types = []
    for path in paths:
        mime_type = magic.from_file(path, mime=True)
        doc_type = get_doc_type(mime_type=mime_type)
        if not doc_type:
            logger.error(f"Unsupported DocType (for MIME Type {mime_type})!")
            raise UnsupportedDocTypeForMimeType(mime_type=mime_type)
        jobtype = doctype2jobtype(doc_type)
        job_types.append(jobtype)
    return ArchiveExtractionJobOutput(file_paths=paths, job_types=job_types)


def doctype2jobtype(doctype: DocType) -> JobType:
    match doctype:
        case DocType.text:
            return JobType.TEXT_INIT
        case DocType.image:
            return JobType.IMAGE_SDOC
        case DocType.audio:
            return JobType.AUDIO_SDOC
        case DocType.video:
            return JobType.VIDEO_SDOC
