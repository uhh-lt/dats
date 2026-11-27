from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class SentenceIndexOutOfRangeError(Exception):
    """Raised when a suggestion names a sentence its document does not have."""

    def __init__(self, sdoc_id: int, sentence: int) -> None:
        super().__init__(f"Document {sdoc_id} has no sentence {sentence}.")
