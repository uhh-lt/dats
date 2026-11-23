import math
from pathlib import Path

import pymupdf
from loguru import logger

from common.doc_type_enum import DocType
from config import conf
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate
from core.doc.folder_enum import FolderType
from core.doc_processing.doc_processing_dto import SdocInitJobInput
from core.doc_processing.entrypoints.follower_utils import start_followers
from core.doc_processing.entrypoints.html_chunking_utils import (
    PageChunk,
    split_html_at_page_markers,
    split_html_into_chunks,
)
from core.doc_processing.entrypoints.txt_chunking_utils import split_text_into_chunks
from repos.db.sql_repo import SQLRepo
from repos.filesystem.temporary_file_crud import crud_temporary_file
from systems.artefact_system.artefact_dto import ProcessingJobInput, ProcessingSettings
from systems.job_system.job_dto import Job, JobOutputBase
from systems.job_system.job_register_decorator import register_job

CHARACTERS_PER_PAGE = conf.chunking.characters_per_page

sqlr = SQLRepo()


class DocChunkingJobInput(ProcessingJobInput):
    temporary_file_id: str
    filename: str


class DocChunkingJobOutput(JobOutputBase):
    files: list[Path]
    folder_id: int | None


@register_job(
    job_type="doc_chunking",
    input_type=DocChunkingJobInput,
    output_type=DocChunkingJobOutput,
)
def handle_pdf_chunking_job(
    payload: DocChunkingJobInput, job: Job
) -> DocChunkingJobOutput:
    # the file is staged in a temporary folder; the chunks are written next to
    # it, and a split file is removed, so sdoc_init moves out every file
    filepath = crud_temporary_file.path(
        id=payload.temporary_file_id, name=payload.filename
    )
    if not filepath.exists():
        logger.error(f"File {filepath} does not exist!")
        raise Exception(f"File {filepath} does not exist!")

    # Chunk the document
    if filepath.suffix == ".txt":
        chunks = chunk_txt(filepath, payload.settings)
    elif filepath.suffix == ".docx" or filepath.suffix == ".doc":
        chunks = chunk_word(filepath)
    elif filepath.suffix == ".pdf":
        chunks = chunk_pdf(filepath, payload.settings)
    elif filepath.suffix == ".html":
        chunks = chunk_html(filepath, payload.settings)
    else:
        logger.error(f"Unsupported file type: {filepath.suffix}")
        raise Exception(f"Unsupported file type: {filepath.suffix}")
    if filepath not in chunks:
        filepath.unlink()

    # create folder if necessary
    folder_id = None
    if len(chunks) > 1:
        with sqlr.transaction() as db:
            folder = crud_folder.create(
                db,
                create_dto=FolderCreate(
                    project_id=payload.project_id,
                    folder_type=FolderType.SDOC_FOLDER,
                    name=filepath.name,
                ),
            )
            folder_id = folder.id

    # create a document for every chunk
    start_followers(
        "doc_chunking",
        [
            (
                "sdoc_init",
                SdocInitJobInput(
                    project_id=payload.project_id,
                    doctype=DocType.text,
                    temporary_file_id=payload.temporary_file_id,
                    filename=chunk.name,
                    folder_id=folder_id,
                    settings=payload.settings,
                ),
            )
            for chunk in chunks
        ],
    )
    return DocChunkingJobOutput(files=chunks, folder_id=folder_id)


def chunk_pdf(filepath: Path, settings: ProcessingSettings) -> list[Path]:
    try:
        src = pymupdf.open(str(filepath))  # type: ignore
        total_pages = src.page_count
    except Exception as e:
        msg = f"Error opening PDF {filepath.name}: {e}"
        logger.error(msg)
        raise RuntimeError(msg)

    # First, we check if the PDF needs to be split
    num_splits = math.ceil(total_pages / settings.pages_per_chunk)
    if num_splits == 1:
        logger.info(f"PDF {filepath.name} has {total_pages} pages; no split needed.")
        src.close()
        return [filepath]

    # Calculate the number of digits needed for zero-padding
    total_digits = len(str(total_pages))

    # If yes, we proceed to split the PDF and save the chunks to disk in the project filesystem
    out_dir = filepath.parent
    logger.info(
        f"Splitting PDF {filepath.name} into {num_splits} chunks of "
        f"up to {settings.pages_per_chunk} pages each. Output will be saved in {out_dir}."
    )

    chunks: list[Path] = []
    for i in range(num_splits):
        start_page = i * settings.pages_per_chunk + 1
        end_page = min((i + 1) * settings.pages_per_chunk, total_pages)
        # Format page range with zero-padding
        page_range_str = f"{start_page:0{total_digits}}-{end_page:0{total_digits}}"
        output_fn = out_dir / f"{filepath.stem}_pages_{page_range_str}.pdf"
        try:
            # Create a new PDF for the chunk
            new_pdf = pymupdf.open()  # type: ignore
            new_pdf.insert_pdf(src, from_page=start_page - 1, to_page=end_page - 1)

            # Save the chunk to disk
            new_pdf.save(str(output_fn))
            new_pdf.close()
            chunks.append(output_fn)

            logger.debug(f"Stored chunk '{output_fn}'")
        except Exception as e:
            msg = f"Skipping due to error creating chunk {i + 1} for PDF {filepath.name}: {e}"
            logger.error(msg)
    src.close()
    return chunks


def chunk_txt(filepath: Path, settings: ProcessingSettings) -> list[Path]:
    """
    Chunk a text file into smaller files based on character limits.

    The function attempts to split text at line breaks to preserve document structure.
    If no line breaks exist, it falls back to hard character splitting.

    Args:
        filepath: The file to chunk.
        settings: The processing settings with the chunk size.

    Returns:
        A list of paths to the chunked files. If no chunking is needed,
        returns a list containing only the original file path.
    """
    characters_per_chunk = CHARACTERS_PER_PAGE * settings.pages_per_chunk

    # Read the text content
    try:
        text = filepath.read_text(encoding="utf-8")
    except Exception as e:
        msg = f"Error reading text file {filepath.name}: {e}"
        logger.error(msg)
        raise RuntimeError(msg)

    # Check if chunking is needed
    if len(text) <= characters_per_chunk:
        logger.info(
            f"Text file {filepath.name} has {len(text)} characters; "
            f"no split needed (limit: {characters_per_chunk})."
        )
        return [filepath]

    # Split text into chunks
    text_chunks = split_text_into_chunks(text, characters_per_chunk)

    # If splitting resulted in only one chunk, no need to save
    if len(text_chunks) == 1:
        logger.info(
            f"Text file {filepath.name} could not be split further; "
            "returning original file."
        )
        return [filepath]

    # Calculate total "pages" and digits needed for zero-padding
    total_chunks = len(text_chunks)
    total_pages = total_chunks * settings.pages_per_chunk
    total_digits = len(str(total_pages))

    # Save chunks to disk
    out_dir = filepath.parent
    logger.info(
        f"Splitting text file {filepath.name} into {total_chunks} chunks of "
        f"up to {characters_per_chunk} characters each. Output will be saved in {out_dir}."
    )

    chunks: list[Path] = []
    for i, chunk_text in enumerate(text_chunks):
        # Calculate page range for this chunk
        start_page = i * settings.pages_per_chunk + 1
        end_page = (i + 1) * settings.pages_per_chunk
        page_range_str = f"{start_page:0{total_digits}}-{end_page:0{total_digits}}"
        output_fn = out_dir / f"{filepath.stem}_pages_{page_range_str}.txt"

        try:
            # Save the chunk to disk
            output_fn.write_text(chunk_text, encoding="utf-8")
            chunks.append(output_fn)
            logger.debug(f"Stored chunk '{output_fn}'")

        except Exception as e:
            msg = f"Skipping due to error creating chunk (pages {page_range_str}) for text file {filepath.name}: {e}"
            logger.error(msg)

    return chunks


def chunk_word(filepath: Path) -> list[Path]:
    logger.info("word chunking not implemented")
    return [filepath]


def chunk_html(filepath: Path, settings: ProcessingSettings) -> list[Path]:
    """
    Chunk an HTML file into smaller files.

    If the HTML has page markers (`<!-- page N -->` comments among the top-level
    elements of its body), it is split at them, `pages_per_chunk` pages per
    chunk, and the chunks are named after the page numbers of the markers.
    Otherwise it is split at element boundaries based on character limits.
    Either way, each chunk is valid HTML with properly opened/closed tags.

    Args:
        filepath: The file to chunk.
        settings: The processing settings with the chunk size.

    Returns:
        A list of paths to the chunked files. If no chunking is needed,
        returns a list containing only the original file path.
    """
    # Read the HTML content
    try:
        html_content = filepath.read_text(encoding="utf-8")
    except Exception as e:
        msg = f"Error reading HTML file {filepath.name}: {e}"
        logger.error(msg)
        raise RuntimeError(msg)

    page_chunks = split_html_at_page_markers(html_content, settings.pages_per_chunk)
    if page_chunks is None:
        page_chunks = _split_html_by_characters(filepath, settings, html_content)

    # If splitting resulted in only one chunk, no need to save
    if len(page_chunks) <= 1:
        logger.info(
            f"HTML file {filepath.name} needs no split; returning original file."
        )
        return [filepath]

    # Calculate the digits needed for zero-padding
    total_digits = len(str(max(chunk.last_page for chunk in page_chunks)))

    # Save chunks to disk
    out_dir = filepath.parent
    logger.info(
        f"Splitting HTML file {filepath.name} into {len(page_chunks)} chunks. "
        f"Output will be saved in {out_dir}."
    )

    chunks: list[Path] = []
    for page_chunk in page_chunks:
        page_range_str = (
            f"{page_chunk.first_page:0{total_digits}}"
            f"-{page_chunk.last_page:0{total_digits}}"
        )
        output_fn = out_dir / f"{filepath.stem}_pages_{page_range_str}.html"

        try:
            # Save the chunk to disk
            output_fn.write_text(page_chunk.html, encoding="utf-8")
            chunks.append(output_fn)
            logger.debug(f"Stored chunk '{output_fn}'")
        except Exception as e:
            msg = f"Skipping due to error creating chunk (pages {page_range_str}) for HTML file {filepath.name}: {e}"
            logger.error(msg)

    return chunks


def _split_html_by_characters(
    filepath: Path, settings: ProcessingSettings, html_content: str
) -> list[PageChunk]:
    """
    Split HTML content without page markers at element boundaries, up to
    `CHARACTERS_PER_PAGE * pages_per_chunk` characters per chunk, each chunk
    counting as `pages_per_chunk` pages.
    """
    characters_per_chunk = CHARACTERS_PER_PAGE * settings.pages_per_chunk

    # Check if chunking is needed
    if len(html_content) <= characters_per_chunk:
        logger.info(
            f"HTML file {filepath.name} has {len(html_content)} characters; "
            f"no split needed (limit: {characters_per_chunk})."
        )
        return []

    pages_per_chunk = settings.pages_per_chunk
    return [
        PageChunk(
            html=chunk_html,
            first_page=i * pages_per_chunk + 1,
            last_page=(i + 1) * pages_per_chunk,
        )
        for i, chunk_html in enumerate(
            split_html_into_chunks(html_content, characters_per_chunk)
        )
    ]
