from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class ListQueryNotSupportedError(Exception):
    """Raised when a similarity search gets a list of texts as its query: the
    query is one text or the id of an image."""

    def __init__(self) -> None:
        super().__init__(
            "A similarity search takes one text or the id of an image as its query, not a list."
        )
