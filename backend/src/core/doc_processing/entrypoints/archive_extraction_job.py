import shutil
import zipfile
from pathlib import Path

import magic
from loguru import logger

from common.doc_type_enum import DocType
from common.doc_type_utils import get_doc_type
from core.doc.source_document_file_crud import truncate_filename
from core.doc_processing.doc_processing_exceptions import (
    ErroneousArchiveError,
    NoValidDocumentInArchiveError,
)
from core.doc_processing.entrypoints.doc_chunking_job import (
    DocChunkingJobInput,
)
from core.doc_processing.entrypoints.follower_utils import start_followers
from repos.filesystem.temporary_file_crud import crud_temporary_file
from systems.artefact_system.artefact_dto import ProcessingJobInput
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job


class ArchiveExtractionJobInput(ProcessingJobInput):
    temporary_file_id: str
    filename: str


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
    # the files are extracted into a new temporary folder, the handover to
    # the chunking jobs; the staged archive is removed afterwards
    archive_path = crud_temporary_file.path(
        id=payload.temporary_file_id, name=payload.filename
    )
    staging_id = crud_temporary_file.create()
    paths = _extract_archive(
        archive_path=archive_path, dst=crud_temporary_file.dir(id=staging_id)
    )
    crud_temporary_file.delete(id=payload.temporary_file_id)

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
            path.unlink()
        else:
            doctypes.append(doctype)
            valid_paths.append(path)
    if len(valid_paths) == 0:
        crud_temporary_file.delete(id=staging_id)
        raise NoValidDocumentInArchiveError(archive_name=payload.filename)
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
                    temporary_file_id=staging_id,
                    filename=path.name,
                    settings=payload.settings,
                ),
            )
            for path in valid_paths
        ],
    )
    return ArchiveExtractionJobOutput(
        file_paths=valid_paths, doctypes=doctypes, invalid_files=invalid_files
    )


def _extract_archive(*, archive_path: Path, dst: Path) -> list[Path]:
    """Extracts the files of the zip archive into `dst`, flattening its folders,
    and returns their paths."""
    logger.info(f"Extracting archive {archive_path.name} to {dst} ...")
    if not zipfile.is_zipfile(archive_path):
        raise ErroneousArchiveError(
            archive_name=archive_path.name, msg="Not a valid zip file!"
        )
    try:
        extracted_file_paths = []
        with zipfile.ZipFile(archive_path, "r") as zip_archive:
            for member in zip_archive.namelist():
                filename = Path(member).name
                # skip directories
                if not filename:
                    continue
                target = dst / truncate_filename(filename)
                with zip_archive.open(member) as source, open(target, "wb") as f:
                    shutil.copyfileobj(source, f)
                extracted_file_paths.append(target)
    except Exception as e:
        logger.error(f"Cannot extract Archive {archive_path.name}! Error: {e}")
        raise ErroneousArchiveError(archive_name=archive_path.name)

    logger.info(f"Extracting archive {archive_path.name} ... Done!")
    return extracted_file_paths
