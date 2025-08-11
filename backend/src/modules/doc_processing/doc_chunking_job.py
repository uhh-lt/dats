import math
from pathlib import Path

import fitz
from common.job_type import JobType
from config import conf
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate, FolderType
from loguru import logger
from preprocessing.preprocessing_service import PreprocessingService
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import (
    FileAlreadyExistsInFilesystemError,
    FileDeletionNotAllowedError,
    FilesystemRepo,
)
from repos.ray_repo import RayRepo
from systems.job_system.job_dto import Job, JobInputBase, JobOutputBase
from systems.job_system.job_register_decorator import register_job

cc = conf.celery

fsr = FilesystemRepo()
pps = PreprocessingService()
ray = RayRepo()


class PDFChunkingJobInput(JobInputBase):
    filename: Path
    max_pages_per_chunk: int = 1


class PDFChunkingJobOutput(JobOutputBase):
    files: list[Path]
    folder_id: int | None


@register_job(
    job_type=JobType.PDF_CHECKING,
    input_type=PDFChunkingJobInput,
    output_type=PDFChunkingJobOutput,
)
def handle_pdf_chunking_job(
    payload: PDFChunkingJobInput, job: Job
) -> PDFChunkingJobOutput:
    input_doc = payload.filename
    max_pages_per_chunk = payload.max_pages_per_chunk
    proj_id = payload.project_id
    try:
        src = fitz.open(str(input_doc))  # type: ignore
        total_pages = src.page_count
    except Exception as e:
        msg = f"Error opening PDF {input_doc.name}: {e}"
        logger.error(msg)
        raise RuntimeError(msg)

    # First, we check if the PDF needs to be split
    num_splits = math.ceil(total_pages / max_pages_per_chunk)
    if num_splits == 1:
        logger.info(f"PDF {input_doc.name} has {total_pages} pages; no split needed.")
        src.close()
        return PDFChunkingJobOutput(files=[input_doc], folder_id=None)

    # Calculate the number of digits needed for zero-padding
    total_digits = len(str(total_pages))

    # If yes, we proceed to split the PDF and save the chunks to disk in the project filesystem
    out_dir = input_doc.parent
    logger.info(
        f"Splitting PDF {input_doc.name} into {num_splits} chunks of "
        f"up to {max_pages_per_chunk} pages each. Output will be saved in {out_dir}."
    )

    chunks: list[Path] = []
    for i in range(num_splits):
        start_page = i * max_pages_per_chunk + 1
        end_page = min((i + 1) * max_pages_per_chunk, total_pages)
        # Format page range with zero-padding
        page_range_str = f"{start_page:0{total_digits}}-{end_page:0{total_digits}}"
        output_fn = out_dir / f"{input_doc.stem}_pages_{page_range_str}.pdf"
        try:
            # Create a new PDF for the chunk
            new_pdf = fitz.open()  # type: ignore
            new_pdf.insert_pdf(src, from_page=start_page - 1, to_page=end_page - 1)

            # If the output file already exists, we try to remove it from the project filesystem
            if output_fn.exists():
                try:
                    fsr._safe_remove_file_from_project_dir(
                        proj_id=proj_id, filename=output_fn.name
                    )
                except FileDeletionNotAllowedError:
                    logger.warning(
                        f"File {output_fn.name} already exists in Project {proj_id} and a SourceDocument with that filename"
                        " exists in the DB. Cannot overwrite it!"
                    )
                    raise FileAlreadyExistsInFilesystemError(
                        proj_id=proj_id, filename=output_fn.name
                    )
            # Save the chunk to disk
            new_pdf.save(str(output_fn))
            new_pdf.close()
            chunks.append(output_fn)

            logger.debug(f"Stored chunk '{output_fn}'")
        except Exception as e:
            msg = f"Skipping due to error creating chunk {i + 1} for PDF {input_doc.name}: {e}"
            logger.error(msg)
    src.close()
    folder_id = None
    if len(chunks) > 1:
        with SQLRepo().db_session() as db:
            folder = crud_folder.create(
                db,
                create_dto=FolderCreate(
                    project_id=payload.project_id,
                    folder_type=FolderType.SDOC_FOLDER,
                    name=payload.filename.name,
                ),
            )
            folder_id = folder.id

    return PDFChunkingJobOutput(files=chunks, folder_id=folder_id)
