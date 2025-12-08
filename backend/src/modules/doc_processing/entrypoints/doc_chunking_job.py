import math
from pathlib import Path

import fitz
from loguru import logger

from common.job_type import JobType
from config import conf
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate, FolderType
from modules.doc_processing.doc_processing_dto import ProcessingJobInput
from modules.doc_processing.entrypoints.html_chunking_utils import (
    split_html_into_chunks,
)
from modules.doc_processing.entrypoints.txt_chunking_utils import split_text_into_chunks
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import (
    FileAlreadyExistsInFilesystemError,
    FileDeletionNotAllowedError,
    FilesystemRepo,
)
from repos.ray.ray_repo import RayRepo
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job

CHARACTERS_PER_PAGE = conf.chunking.characters_per_page

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


def _prepare_chunk_output_path(project_id: int, output_path: Path) -> None:
    """
    Prepare the output path for a chunk file by removing any existing file.

    Args:
        project_id: The project ID for filesystem operations.
        output_path: The path where the chunk will be saved.

    Raises:
        FileAlreadyExistsInFilesystemError: If the file exists and cannot be removed
            because a SourceDocument with that filename exists in the DB.
    """
    if output_path.exists():
        try:
            fsr._safe_remove_file_from_project_dir(
                proj_id=project_id, filename=output_path.name
            )
        except FileDeletionNotAllowedError:
            logger.warning(
                f"File {output_path.name} already exists in Project {project_id} "
                "and a SourceDocument with that filename exists in the DB. Cannot overwrite it!"
            )
            raise FileAlreadyExistsInFilesystemError(
                proj_id=project_id, filename=output_path.name
            )


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

            # Prepare output path (remove existing file if necessary)
            _prepare_chunk_output_path(payload.project_id, output_fn)

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
    """
    Chunk a text file into smaller files based on character limits.

    The function attempts to split text at line breaks to preserve document structure.
    If no line breaks exist, it falls back to hard character splitting.

    Args:
        payload: The job input containing the filepath and chunking settings.

    Returns:
        A list of paths to the chunked files. If no chunking is needed,
        returns a list containing only the original file path.
    """
    characters_per_chunk = CHARACTERS_PER_PAGE * payload.settings.pages_per_chunk

    # Read the text content
    try:
        text = payload.filepath.read_text(encoding="utf-8")
    except Exception as e:
        msg = f"Error reading text file {payload.filepath.name}: {e}"
        logger.error(msg)
        raise RuntimeError(msg)

    # Check if chunking is needed
    if len(text) <= characters_per_chunk:
        logger.info(
            f"Text file {payload.filepath.name} has {len(text)} characters; "
            f"no split needed (limit: {characters_per_chunk})."
        )
        return [payload.filepath]

    # Split text into chunks
    text_chunks = split_text_into_chunks(text, characters_per_chunk)

    # If splitting resulted in only one chunk, no need to save
    if len(text_chunks) == 1:
        logger.info(
            f"Text file {payload.filepath.name} could not be split further; "
            "returning original file."
        )
        return [payload.filepath]

    # Calculate total "pages" and digits needed for zero-padding
    total_chunks = len(text_chunks)
    total_pages = total_chunks * payload.settings.pages_per_chunk
    total_digits = len(str(total_pages))

    # Save chunks to disk
    out_dir = payload.filepath.parent
    logger.info(
        f"Splitting text file {payload.filepath.name} into {total_chunks} chunks of "
        f"up to {characters_per_chunk} characters each. Output will be saved in {out_dir}."
    )

    chunks: list[Path] = []
    for i, chunk_text in enumerate(text_chunks):
        # Calculate page range for this chunk
        start_page = i * payload.settings.pages_per_chunk + 1
        end_page = (i + 1) * payload.settings.pages_per_chunk
        page_range_str = f"{start_page:0{total_digits}}-{end_page:0{total_digits}}"
        output_fn = out_dir / f"{payload.filepath.stem}_pages_{page_range_str}.txt"

        try:
            # Prepare output path (remove existing file if necessary)
            _prepare_chunk_output_path(payload.project_id, output_fn)

            # Save the chunk to disk
            output_fn.write_text(chunk_text, encoding="utf-8")
            chunks.append(output_fn)
            logger.debug(f"Stored chunk '{output_fn}'")

        except Exception as e:
            msg = f"Skipping due to error creating chunk (pages {page_range_str}) for text file {payload.filepath.name}: {e}"
            logger.error(msg)

    return chunks


def chunk_word(payload: DocChunkingJobInput) -> list[Path]:
    logger.info("word chunking not implemented")
    return [payload.filepath]


def chunk_html(payload: DocChunkingJobInput) -> list[Path]:
    """
    Chunk an HTML file into smaller files based on character limits.

    The function splits HTML at element boundaries to preserve document structure
    and ensures each chunk is valid HTML by properly opening/closing tags.

    Args:
        payload: The job input containing the filepath and chunking settings.

    Returns:
        A list of paths to the chunked files. If no chunking is needed,
        returns a list containing only the original file path.
    """
    characters_per_chunk = CHARACTERS_PER_PAGE * payload.settings.pages_per_chunk

    # Read the HTML content
    try:
        html_content = payload.filepath.read_text(encoding="utf-8")
    except Exception as e:
        msg = f"Error reading HTML file {payload.filepath.name}: {e}"
        logger.error(msg)
        raise RuntimeError(msg)

    # Check if chunking is needed
    if len(html_content) <= characters_per_chunk:
        logger.info(
            f"HTML file {payload.filepath.name} has {len(html_content)} characters; "
            f"no split needed (limit: {characters_per_chunk})."
        )
        return [payload.filepath]

    # Split HTML into chunks
    html_chunks = split_html_into_chunks(html_content, characters_per_chunk)

    # If splitting resulted in only one chunk, no need to save
    if len(html_chunks) == 1:
        logger.info(
            f"HTML file {payload.filepath.name} could not be split further; "
            "returning original file."
        )
        return [payload.filepath]

    # Calculate total "pages" and digits needed for zero-padding
    total_chunks = len(html_chunks)
    total_pages = total_chunks * payload.settings.pages_per_chunk
    total_digits = len(str(total_pages))

    # Save chunks to disk
    out_dir = payload.filepath.parent
    logger.info(
        f"Splitting HTML file {payload.filepath.name} into {total_chunks} chunks of "
        f"up to {characters_per_chunk} characters each. Output will be saved in {out_dir}."
    )

    chunks: list[Path] = []
    for i, chunk_html in enumerate(html_chunks):
        # Calculate page range for this chunk
        start_page = i * payload.settings.pages_per_chunk + 1
        end_page = (i + 1) * payload.settings.pages_per_chunk
        page_range_str = f"{start_page:0{total_digits}}-{end_page:0{total_digits}}"
        output_fn = out_dir / f"{payload.filepath.stem}_pages_{page_range_str}.html"

        try:
            # Prepare output path (remove existing file if necessary)
            _prepare_chunk_output_path(payload.project_id, output_fn)

            # Save the chunk to disk
            output_fn.write_text(chunk_html, encoding="utf-8")
            chunks.append(output_fn)
            logger.debug(f"Stored chunk '{output_fn}'")
        except Exception as e:
            msg = f"Skipping due to error creating chunk (pages {page_range_str}) for HTML file {payload.filepath.name}: {e}"
            logger.error(msg)

    return chunks
