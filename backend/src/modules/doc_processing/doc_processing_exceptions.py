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
    """Raised when a step is recomputed for documents it is not planned for:
    Recompute never plans a step; enabling or completing its feature does."""

    def __init__(self, step: str, sdoc_ids: list[int]) -> None:
        super().__init__(
            f"Step '{step}' is not planned for the documents {sdoc_ids}. Enable or "
            "complete the feature that needs it to compute it."
        )
