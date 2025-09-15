from fastapi import Request
from fastapi.responses import PlainTextResponse
from loguru import logger

exception_handlers = []


def exception_handler(http_status_code: int):
    def decorator(exception_class):
        def handle_exception(req: Request, exc: Exception):
            logger.exception(exc)
            return PlainTextResponse(str(exc), status_code=http_status_code)

        exception_handlers.append((exception_class, handle_exception))
        return exception_class

    return decorator
