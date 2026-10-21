from pathlib import Path

from fastapi import status

from common.exception_handler import exception_handler
from core.doc.source_document_dto import SourceDocumentRead


@exception_handler(status.HTTP_404_NOT_FOUND)
class SourceDocumentNotFoundInFilesystemError(Exception):
    def __init__(self, sdoc: SourceDocumentRead, dst: str | Path):
        super().__init__(
            (
                f"The original file of SourceDocument {sdoc.id} ({sdoc.filename}) cannot be found in "
                f"the DATS Filesystem at {dst}"
            )
        )


@exception_handler(status.HTTP_404_NOT_FOUND)
class FileNotFoundInFilesystemError(Exception):
    def __init__(self, project_id: int, filename: str | Path, dst: str | Path):
        super().__init__(
            f"The file '{filename}' of Project {project_id} cannot be found in the DATS Filesystem at {dst}"
        )


@exception_handler(status.HTTP_409_CONFLICT)
class FileAlreadyExistsInFilesystemError(Exception):
    def __init__(self, project_id: int, filename: str | Path):
        super().__init__(
            f"Cannot store the file '{filename}' of Project {project_id} because there is a file with the "
            f"same name in the DATS Filesystem associated with a SourceDocument!"
        )


@exception_handler(status.HTTP_400_BAD_REQUEST)
class FileDeletionNotAllowedError(Exception):
    def __init__(self, project_id: int, sdoc_id: int, filename: str | Path, dst: str):
        super().__init__(
            f"Cannot remove the file '{filename}' of Project {project_id} because it is associated"
            f" with SourceDocument {sdoc_id}!"
        )


@exception_handler(status.HTTP_500_INTERNAL_SERVER_ERROR)
class FileRemovalError(Exception):
    def __init__(self, project_id: int, filename: str | Path, dst: str):
        super().__init__(
            f"Cannot remove the file '{filename}' of Project {project_id} at {dst}!"
        )


@exception_handler(status.HTTP_409_CONFLICT)
class ProjectAlreadyExistsInFilesystemError(Exception):
    def __init__(self, project_id: int):
        super().__init__(
            f"Cannot create directory structure for Project {project_id} because it already exists!"
        )


@exception_handler(status.HTTP_400_BAD_REQUEST)
class UnsupportedDocTypeForSourceDocument(Exception):
    def __init__(self, dst_path: Path):
        super().__init__(
            f"Unsupported DocType! Cannot create SourceDocument from file {dst_path}."
        )


@exception_handler(status.HTTP_400_BAD_REQUEST)
class ErroneousArchiveException(Exception):
    def __init__(self, archive_path: Path, msg: str | None = None):
        super().__init__(
            f"Error with Archive {archive_path}{' :' + msg if msg else ''}"
        )
