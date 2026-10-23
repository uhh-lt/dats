from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class ReadOnlyMetadataError(Exception):
    """
    Raised when a user changes or deletes read-only metadata (a project metadata key
    that the system creates and fills, or one of its document values).
    """

    def __init__(self, keys: list[str]) -> None:
        self.keys = keys
        super().__init__(f"Read-only metadata cannot be changed or deleted: {keys}.")
