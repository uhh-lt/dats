from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class QueryDocumentNotAnImageError(Exception):
    """Raised when a similarity search names a document as its query that is
    not an image (a query that is an integer or a string of digits names the
    document whose image is searched for)."""

    def __init__(self, sdoc_id: int) -> None:
        super().__init__(
            f"Document {sdoc_id} is not an image; a similarity search by a document "
            "takes the id of an image document."
        )
