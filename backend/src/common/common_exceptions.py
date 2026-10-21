from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_404_NOT_FOUND)
class NotFoundError(Exception):
    """
    Base class for all errors that signal a missing object (SQL row, Weaviate
    object, Elasticsearch document). FastAPI resolves exception handlers along
    the MRO, so every subclass is mapped to HTTP 404 without its own decorator.
    """
