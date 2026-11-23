from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_413_CONTENT_TOO_LARGE)
class UploadTooLargeError(Exception):
    def __init__(self, filename: str, max_size: int) -> None:
        super().__init__(
            f"File {filename} is too large! Maximum allowed size in bytes: {max_size}"
        )


@exception_handler(status.HTTP_409_CONFLICT)
class FileAlreadyExistsError(Exception):
    def __init__(self, name: str) -> None:
        super().__init__(f"The file '{name}' already exists in the DATS Filesystem!")
