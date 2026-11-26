from pathlib import Path

from loguru import logger

from core.doc.source_document_dto import (
    SDOC_FILENAME_MAX_LENGTH,
    SDOC_SUFFIX_MAX_LENGTH,
)
from core.doc.source_document_orm import SourceDocumentORM
from repos.filesystem.file_crud_base import FileCRUDBase


def truncate_filename(filename: str) -> str:
    """The filename of a new source document: too long names are shortened,
    keeping their last three suffixes."""
    path = Path(filename)
    if len(path.name) <= SDOC_FILENAME_MAX_LENGTH + SDOC_SUFFIX_MAX_LENGTH:
        return path.name
    logger.warning(f'Filename "{path.name}" is too long and gets truncated!')
    suffix = "".join(path.suffixes[-3:])[-SDOC_SUFFIX_MAX_LENGTH:]
    return path.name.removesuffix(suffix)[:SDOC_FILENAME_MAX_LENGTH] + suffix


class CRUDSourceDocumentFile(FileCRUDBase):
    """The uploaded file of a source document, under its original filename:
    `sdoc_files/<sdoc_id>/<filename>`."""

    folder = "sdoc_files"
    owner = SourceDocumentORM


crud_sdoc_file = CRUDSourceDocumentFile()
