from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from rq.exceptions import NoSuchJobError


def register_exception_handlers(app: FastAPI):
    @app.exception_handler(NoSuchJobError)
    async def no_such_job_error_handler(_, exc: NoSuchJobError):
        return PlainTextResponse(str(exc), status_code=404)
