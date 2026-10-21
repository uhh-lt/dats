import traceback
from collections.abc import Callable

from fastapi import Request
from fastapi.responses import PlainTextResponse
from loguru import logger

exception_handlers = []


def exception_handler(
    http_status_code: int | Callable[[Exception], int],
    extract_message: Callable[[Exception], str] = lambda exc: str(exc),
):
    def decorator(exception_class):
        def handle_exception(req: Request, exc: Exception):
            *_, (frame, lineno) = traceback.walk_tb(exc.__traceback__)

            # start traceback at our code by skipping any library code (starlette etc.)
            tb = exc.__traceback__
            while tb is not None and "site-packages" in tb.tb_frame.f_code.co_filename:
                tb = tb.tb_next

            # override line, function name, module etc. because loguru would
            # otherwise use the current file location, function name etc.
            logger.patch(
                lambda record: record.update(
                    line=lineno,  # type: ignore
                    function=frame.f_code.co_name,
                    module=frame.f_globals["__name__"].split(".")[-1],
                    name=frame.f_globals["__name__"],
                )
            ).opt(exception=(type(exc), exc, tb)).error(extract_message(exc))

            if isinstance(http_status_code, int):
                status_code = http_status_code
            elif isinstance(http_status_code, Callable):
                status_code = http_status_code(exc)
            else:
                status_code = 500  # type: ignore

            return PlainTextResponse(extract_message(exc), status_code)

        exception_handlers.append((exception_class, handle_exception))
        return exception_class

    return decorator
