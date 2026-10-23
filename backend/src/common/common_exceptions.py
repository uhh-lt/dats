from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_404_NOT_FOUND)
class NotFoundError(Exception):
    """
    Base class for all errors that signal a missing object (SQL row, Weaviate
    object, Elasticsearch document). FastAPI resolves exception handlers along
    the MRO, so every subclass is mapped to HTTP 404 without its own decorator.
    """


@exception_handler(status.HTTP_400_BAD_REQUEST)
class DuplicateIdsError(Exception):
    """
    Raised by batch operations that need every id at most once (e.g. update_multi),
    so that the result for an id is never ambiguous.
    """

    def __init__(self, duplicate_ids: list[object]) -> None:
        self.duplicate_ids = duplicate_ids
        super().__init__(f"The request contains duplicate IDs: {duplicate_ids}.")
