from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class TagOwnParentError(Exception):
    """Raised when a tag would become its own parent."""

    def __init__(self, tag_id: int) -> None:
        super().__init__(f"Tag {tag_id} cannot be its own parent.")
