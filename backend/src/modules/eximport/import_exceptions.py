from fastapi import status

from common.exception_handler import exception_handler
from modules.eximport.import_job_dto import ImportJobType


@exception_handler(status.HTTP_500_INTERNAL_SERVER_ERROR)
class ImportJobPreparationError(Exception):
    def __init__(self, cause: Exception) -> None:
        super().__init__(f"Cannot prepare and create the Import Job! {cause}")


@exception_handler(status.HTTP_500_INTERNAL_SERVER_ERROR)
class UnsupportedImportJobTypeError(Exception):
    def __init__(self, import_job_type: ImportJobType) -> None:
        super().__init__(f"ImportJobType {import_job_type} is not supported! ")


class ImportBBoxAnnotationsError(Exception):
    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing bbox annotations: {errors}")


class ImportCodesError(Exception):
    """Exception raised when code import fails."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing codes: {errors}")
        self.errors = errors


class ImportCOTAError(Exception):
    """Exception raised when COTA import fails."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__(
            f"Errors occurred while importing concept over time analyses: {errors}"
        )
        self.errors = errors


class ImportFoldersError(Exception):
    """Exception raised when folder import fails."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing folders: {errors}")
        self.errors = errors


class ImportMemosError(Exception):
    """Exception raised when memo import fails."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing memos: {errors}")
        self.errors = errors


class ImportProjectMetadataError(Exception):
    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing project metadata: {errors}")


class ImportSourceDocumentsError(Exception):
    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing source documents: {errors}")


class ImportSentenceAnnotationsError(Exception):
    def __init__(self, errors: list[str]) -> None:
        super().__init__(
            f"Errors occurred while importing sentence annotations: {errors}"
        )


class ImportSpanAnnotationsError(Exception):
    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing span annotations: {errors}")


class ImportTagsError(Exception):
    """Exception raised when tag import fails."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing tags: {errors}")
        self.errors = errors


class ImportTimelineAnalysisError(Exception):
    """Exception raised when timeline analysis import fails."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing timeline analyses: {errors}")
        self.errors = errors


class ImportUsersError(Exception):
    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing users: {errors}")


class ImportWhiteboardsError(Exception):
    """Exception raised when whiteboard import fails."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__(f"Errors occurred while importing whiteboards: {errors}")
        self.errors = errors
