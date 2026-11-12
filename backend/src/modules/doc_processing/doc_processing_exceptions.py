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


class PipelineDeclarationError(Exception):
    """Raised at startup when the `@pipeline_step` declarations of
    the pipeline steps do not form a valid pipeline (e.g. an artefact nobody
    produces, or a cycle)."""

    def __init__(self, problems: list[str]) -> None:
        self.problems = problems
        super().__init__(
            "Invalid preprocessing pipeline declarations:\n- " + "\n- ".join(problems)
        )


class PipelineNotRegisteredError(Exception):
    """Raised when the pipeline graph is read before the jobs were registered."""

    def __init__(self) -> None:
        super().__init__(
            "No pipeline steps are registered. Register the jobs first "
            "(bootstrap.register_jobs)."
        )
