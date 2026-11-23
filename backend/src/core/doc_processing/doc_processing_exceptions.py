from fastapi import status

from common.exception_handler import exception_handler


class LanguageNotSupportedError(Exception):
    def __init__(self, detected_language: str) -> None:
        super().__init__(
            f"The detected language '{detected_language}' is not supported by DATS!"
        )


@exception_handler(status.HTTP_406_NOT_ACCEPTABLE)
class UnsupportedMimeTypeError(Exception):
    def __init__(self, mime_type: str | None) -> None:
        if mime_type is None:
            super().__init__("Could not determine MIME type of uploaded file!")
        else:
            super().__init__(f"Document with MIME type {mime_type} not supported!")


@exception_handler(status.HTTP_400_BAD_REQUEST)
class NoFilesProcessedError(Exception):
    def __init__(self) -> None:
        super().__init__("No files were processed or no job was started.")


@exception_handler(status.HTTP_400_BAD_REQUEST)
class StepNotPlannedError(Exception):
    """Raised when the step of a feature is recomputed for documents it is not
    planned for: Recompute plans only the missing core steps; enabling or
    completing the feature plans its steps."""

    def __init__(self, step: str, sdoc_ids: list[int]) -> None:
        super().__init__(
            f"Step '{step}' is not planned for the documents {sdoc_ids}. It belongs "
            "to a feature: enable or complete the feature that needs it to compute it."
        )


@exception_handler(status.HTTP_409_CONFLICT)
class SourceDocumentFilenameExistsError(Exception):
    def __init__(self, filename: str) -> None:
        super().__init__(
            f"Cannot upload the file '{filename}': the project has a document "
            "with this filename!"
        )


@exception_handler(status.HTTP_400_BAD_REQUEST)
class ErroneousArchiveError(Exception):
    def __init__(self, archive_name: str, msg: str | None = None) -> None:
        super().__init__(
            f"Error with Archive {archive_name}{': ' + msg if msg else ''}"
        )


class NoValidDocumentInArchiveError(Exception):
    def __init__(self, archive_name: str) -> None:
        super().__init__(
            f"Archive extraction failed! No valid document found in {archive_name}."
        )


@exception_handler(status.HTTP_400_BAD_REQUEST)
class UploadWithoutFilenameError(Exception):
    def __init__(self) -> None:
        super().__init__("Uploaded file has no filename!")
