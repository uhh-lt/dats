import math
from pathlib import Path

import fitz
from loguru import logger

from common.job_type import JobType
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate, FolderType
from modules.doc_processing.doc_processing_dto import ProcessingJobInput
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import (
    FileAlreadyExistsInFilesystemError,
    FileDeletionNotAllowedError,
    FilesystemRepo,
)
from repos.ray_repo import RayRepo
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()
fsr = FilesystemRepo()
ray = RayRepo()


class DocChunkingJobInput(ProcessingJobInput):
    filepath: Path


class DocChunkingJobOutput(JobOutputBase):
    files: list[Path]
    folder_id: int | None


@register_job(
    job_type=JobType.DOC_CHUNKING,
    input_type=DocChunkingJobInput,
    output_type=DocChunkingJobOutput,
)
def handle_pdf_chunking_job(
    payload: DocChunkingJobInput, job: Job
) -> DocChunkingJobOutput:
    if not payload.filepath.exists():
        logger.error(f"File {payload.filepath} does not exist!")
        raise Exception(f"File {payload.filepath} does not exist!")

    # TODO: these extractions have varying compute requirements when run
    #       across multiple machines or using GPU

    # Chunk the document
    if payload.filepath.suffix == ".txt":
        chunks = chunk_txt(payload)
    elif payload.filepath.suffix == ".docx" or payload.filepath.suffix == ".doc":
        chunks = chunk_word(payload)
    elif payload.filepath.suffix == ".pdf":
        chunks = chunk_pdf(payload)
    elif payload.filepath.suffix == ".html":
        chunks = chunk_html(payload)
    else:
        logger.error(f"Unsupported file type: {payload.filepath.suffix}")
        raise Exception(f"Unsupported file type: {payload.filepath.suffix}")

    # create folder if necessary
    folder_id = None
    if len(chunks) > 1:
        with sqlr.db_session() as db:
            folder = crud_folder.create(
                db,
                create_dto=FolderCreate(
                    project_id=payload.project_id,
                    folder_type=FolderType.SDOC_FOLDER,
                    name=payload.filepath.name,
                ),
            )
            folder_id = folder.id

    return DocChunkingJobOutput(files=chunks, folder_id=folder_id)


def chunk_pdf(payload: DocChunkingJobInput) -> list[Path]:
    try:
        src = fitz.open(str(payload.filepath))  # type: ignore
        total_pages = src.page_count
    except Exception as e:
        msg = f"Error opening PDF {payload.filepath.name}: {e}"
        logger.error(msg)
        raise RuntimeError(msg)

    # First, we check if the PDF needs to be split
    num_splits = math.ceil(total_pages / payload.settings.pages_per_chunk)
    if num_splits == 1:
        logger.info(
            f"PDF {payload.filepath.name} has {total_pages} pages; no split needed."
        )
        src.close()
        return [payload.filepath]

    # Calculate the number of digits needed for zero-padding
    total_digits = len(str(total_pages))

    # If yes, we proceed to split the PDF and save the chunks to disk in the project filesystem
    out_dir = payload.filepath.parent
    logger.info(
        f"Splitting PDF {payload.filepath.name} into {num_splits} chunks of "
        f"up to {payload.settings.pages_per_chunk} pages each. Output will be saved in {out_dir}."
    )

    chunks: list[Path] = []
    for i in range(num_splits):
        start_page = i * payload.settings.pages_per_chunk + 1
        end_page = min((i + 1) * payload.settings.pages_per_chunk, total_pages)
        # Format page range with zero-padding
        page_range_str = f"{start_page:0{total_digits}}-{end_page:0{total_digits}}"
        output_fn = out_dir / f"{payload.filepath.stem}_pages_{page_range_str}.pdf"
        try:
            # Create a new PDF for the chunk
            new_pdf = fitz.open()  # type: ignore
            new_pdf.insert_pdf(src, from_page=start_page - 1, to_page=end_page - 1)

            # If the output file already exists, we try to remove it from the project filesystem
            if output_fn.exists():
                try:
                    fsr._safe_remove_file_from_project_dir(
                        proj_id=payload.project_id, filename=output_fn.name
                    )
                except FileDeletionNotAllowedError:
                    logger.warning(
                        f"File {output_fn.name} already exists in Project {payload.project_id} and a SourceDocument with that filename"
                        " exists in the DB. Cannot overwrite it!"
                    )
                    raise FileAlreadyExistsInFilesystemError(
                        proj_id=payload.project_id, filename=output_fn.name
                    )
            # Save the chunk to disk
            new_pdf.save(str(output_fn))
            new_pdf.close()
            chunks.append(output_fn)

            logger.debug(f"Stored chunk '{output_fn}'")
        except Exception as e:
            msg = f"Skipping due to error creating chunk {i + 1} for PDF {payload.filepath.name}: {e}"
            logger.error(msg)
    src.close()
    return chunks


def chunk_txt(payload: DocChunkingJobInput) -> list[Path]:
    logger.info("txt chunking not implemented")
    return [payload.filepath]


def chunk_word(payload: DocChunkingJobInput) -> list[Path]:
    logger.info("word chunking not implemented")
    return [payload.filepath]


def chunk_html(payload: DocChunkingJobInput) -> list[Path]:
    logger.info("html chunking not implemented")
    return [payload.filepath]
