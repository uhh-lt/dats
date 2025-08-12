from pathlib import Path

import magic
from common.doc_type import DocType, get_doc_type
from common.job_type import JobType
from loguru import logger
from modules.doc_processing.doc_processing_dto import ProcessingJobInput
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job

fsr: FilesystemRepo = FilesystemRepo()


class ArchiveExtractionJobInput(ProcessingJobInput):
    filepath: Path


class ArchiveExtractionJobOutput(JobOutputBase):
    file_paths: list[Path]
    doctypes: list[DocType]
    invalid_files: list[str]


def extract_archive(payload: ArchiveExtractionJobInput) -> ArchiveExtractionJobOutput:
    paths = fsr.extract_archive_in_project(payload.project_id, payload.filepath)
    doctypes = []
    valid_paths = []
    invalid_files = []
    for path in paths:
        mime_type = magic.from_file(path, mime=True)
        doctype = get_doc_type(mime_type=mime_type)
        if not doctype:
            logger.warning(
                f"Unsupported DocType (for MIME Type {mime_type})! Skipping document {path.name} from archive."
            )
            invalid_files.append(path.name)
        else:
            doctypes.append(doctype)
            valid_paths.append(path)
    if len(valid_paths) == 0:
        raise Exception("Archive extraction failed! No valid document found within!")
    job.update(
        status_message=f"Extracted {len(paths)} files, {len(valid_paths)} can be processed, {len(invalid_files)} are unsupprted/skipped."
    )
    return ArchiveExtractionJobOutput(
        file_paths=valid_paths, doctypes=doctypes, invalid_files=invalid_files
    )


@register_job(
    job_type=JobType.EXTRACT_ARCHIVE,
    input_type=ArchiveExtractionJobInput,
    output_type=ArchiveExtractionJobOutput,
)
def handle_extract_archive_job(
    payload: ArchiveExtractionJobInput, job: Job
) -> ArchiveExtractionJobOutput:
    return extract_archive(payload=payload)
