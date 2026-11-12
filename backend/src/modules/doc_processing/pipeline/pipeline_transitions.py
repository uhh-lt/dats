"""The inputs of the jobs that the entry points start (see `ENTRY_POINTS` in
`step_run.py`): they create documents and fan out over files. The
pipeline steps need no such function: a finished step starts its successors with
a bare `SdocProcessingJobInput`, which their enrichers complete."""

from common.doc_type_enum import DocType
from modules.crawler.crawler_job import CrawlerJobInput, CrawlerJobOutput
from modules.doc_processing.doc_processing_dto import SdocInitJobInput
from modules.doc_processing.entrypoints.archive_extraction_job import (
    ArchiveExtractionJobInput,
    ArchiveExtractionJobOutput,
)
from modules.doc_processing.entrypoints.doc_chunking_job import (
    DocChunkingJobInput,
    DocChunkingJobOutput,
)
from modules.doc_processing.text.html_extraction_job import (
    ExtractHTMLJobInput,
    ExtractHTMLJobOutput,
)


def crawler_to_extract_archive(input, output):
    assert isinstance(input, CrawlerJobInput), "Expected CrawlerJobInput"
    assert isinstance(output, CrawlerJobOutput), "Expected CrawlerJobOutput"
    return ArchiveExtractionJobInput(
        project_id=input.project_id,
        filepath=output.crawled_data_zip,
        settings=input.settings,
    )


def extract_archive_to_pdf_chunking(input, output, idx):
    assert isinstance(input, ArchiveExtractionJobInput), (
        "Expected ArchiveExtractionJobInput"
    )
    assert isinstance(output, ArchiveExtractionJobOutput), (
        "Expected ArchiveExtractionJobOutput"
    )
    path = output.file_paths[idx]
    return DocChunkingJobInput(
        project_id=input.project_id, filepath=path, settings=input.settings
    )


def doc_chunking_to_sdoc_init(input, output, idx):
    assert isinstance(input, DocChunkingJobInput), "Expected PDFChunkingJobInput"
    assert isinstance(output, DocChunkingJobOutput), "Expected PDFChunkingJobOutput"
    path = output.files[idx]
    return SdocInitJobInput(
        project_id=input.project_id,
        doctype=DocType.text,
        filepath=path,
        folder_id=output.folder_id,
        settings=input.settings,
    )


def extract_html_to_image_sdoc_init(input, output, idx):
    assert isinstance(input, ExtractHTMLJobInput), "Expected ExtractHTMLJobInput"
    assert isinstance(output, ExtractHTMLJobOutput), "Expected ExtractHTMLJobOutput"
    path = output.image_paths[idx]
    return SdocInitJobInput(
        project_id=input.project_id,
        filepath=path,
        folder_id=output.folder_id,
        doctype=DocType.image,
        settings=input.settings,
    )
