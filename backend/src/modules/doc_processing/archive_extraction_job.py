from pathlib import Path

import magic
from common.doc_type import DocType, get_doc_type
from common.job_type import JobType
from loguru import logger
from modules.doc_processing.preprocessing_new_service import (
    UnsupportedDocTypeForMimeType,
)
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job, JobInputBase, JobOutputBase
from systems.job_system.job_register_decorator import register_job

fsr: FilesystemRepo = FilesystemRepo()


class ArchiveExtractionJobInput(JobInputBase):
    filepath: Path


class ArchiveExtractionJobOutput(JobOutputBase):
    file_paths: list[Path]
    doctypes: list[DocType]


@register_job(
    job_type=JobType.SDOC_INIT,
    input_type=ArchiveExtractionJobInput,
    output_type=ArchiveExtractionJobOutput,
)
def handle_init_text_job(
    payload: ArchiveExtractionJobInput, job: Job
) -> ArchiveExtractionJobOutput:
    paths = FilesystemRepo().extract_archive_in_project(
        payload.project_id, payload.filepath
    )
    doctypes = []
    for path in paths:
        mime_type = magic.from_file(path, mime=True)
        doctype = get_doc_type(mime_type=mime_type)
        if not doctype:
            logger.error(f"Unsupported DocType (for MIME Type {mime_type})!")
            raise UnsupportedDocTypeForMimeType(mime_type=mime_type)
        doctypes.append(doctype)
    return ArchiveExtractionJobOutput(file_paths=paths, doctypes=doctypes)
