from pathlib import Path

import magic
from loguru import logger

from common.doc_type_enum import DocType
from common.doc_type_utils import get_doc_type
from core.doc_processing.entrypoints.doc_chunking_job import (
    DocChunkingJobInput,
)
from core.doc_processing.entrypoints.follower_utils import start_followers
from repos.filesystem_repo import FilesystemRepo
from systems.artefact_system.artefact_dto import ProcessingJobInput
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job

fsr: FilesystemRepo = FilesystemRepo()


class ArchiveExtractionJobInput(ProcessingJobInput):
    filepath: Path


class ArchiveExtractionJobOutput(JobOutputBase):
    file_paths: list[Path]
    doctypes: list[DocType]
    invalid_files: list[str]


@register_job(
    job_type="extract_archive",
    input_type=ArchiveExtractionJobInput,
    output_type=ArchiveExtractionJobOutput,
)
def handle_archive_extraction_job(
    payload: ArchiveExtractionJobInput, job: Job
) -> ArchiveExtractionJobOutput:
    paths = FilesystemRepo().extract_archive_in_project(
        payload.project_id, payload.filepath
    )
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
    # chunk every extracted file
    start_followers(
        "extract_archive",
        [
            (
                "doc_chunking",
                DocChunkingJobInput(
                    project_id=payload.project_id,
                    filepath=path,
                    settings=payload.settings,
                ),
            )
            for path in valid_paths
        ],
    )
    return ArchiveExtractionJobOutput(
        file_paths=valid_paths, doctypes=doctypes, invalid_files=invalid_files
    )
