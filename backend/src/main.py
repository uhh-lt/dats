# ignore unorganized imports for this file
# ruff: noqa: E402

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import PlainTextResponse
from fastapi.routing import APIRoute
from loguru import logger
from psycopg2.errors import UniqueViolation
from sqlalchemy.exc import IntegrityError
from starlette.middleware.sessions import SessionMiddleware
from uvicorn.main import run

from common.exception_handler import exception_handlers
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.llm_repo import LLMRepo
from utils.import_utils import import_by_suffix

#####################################################################################################################
#                                               READ BEFORE CHANGING                                                #
#####################################################################################################################
#                               !!!!! IMPORT STUFF ONLY AFTER THE STARTUP CALL !!!!!                                #
#       It's very important to NOT import ANY DATS internal models here, as this would lead to circular imports.    #
#####################################################################################################################

# Flo: just do it once. We have to check because if we start the main function,
#  unvicorn will import this file once more manually, so it would be executed twice.
STARTUP_DONE = bool(int(os.environ.get("STARTUP_DONE", "0")))
RESET_DATA = bool(int(os.environ.get("RESET_DATA", "0")))
if not STARTUP_DONE:
    from startup import startup  # isort: skip

    startup(reset_data=RESET_DATA, sql_echo=False)
    os.environ["STARTUP_DONE"] = "1"

from rq.exceptions import NoSuchJobError

from config import conf
from repos.filesystem_repo import FilesystemRepo

# import all jobs dynamically
import_by_suffix("_job.py")


# custom method to generate OpenApi function names
def custom_generate_unique_id(route: APIRoute):
    return f"{route.tags[0]}-{route.name}"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Discourse Analysis Tool Suite FastAPI!")
    yield
    # Shutdown
    logger.info("Stopping Discourse Analysis Tool Suite FastAPI!")
    FilesystemRepo().purge_temporary_files()
    # Close repo connections
    LLMRepo().close_connection()
    ElasticSearchRepo().close_connection()


# create the FastAPI app
app = FastAPI(
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=lifespan,
)


# customize openapi schema
# we need to add some DTOs manually, because they are not used in any endpoint, but needed in the frontend nonetheless
def custom_openapi():
    openapi_schema = get_openapi(
        title="Discourse Analysis Tool Suite API",
        version=conf.api.version,
        routes=app.routes,
    )
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

# Handle CORS
# TODO Flo: Handle CORS via ReverseProxy in FrontEnd!
origins = [
    "http://localhost",
    "http://localhost:8080",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware to return GZip for results over a certain number of bytes
app.add_middleware(GZipMiddleware, minimum_size=500)


# Middleware required for Oauth2
# see https://docs.authlib.org/en/latest/client/fastapi.html
app.add_middleware(SessionMiddleware, secret_key=conf.api.auth.session.secret)


# import & register all endpoints dynamically
endpoint_modules = import_by_suffix("_endpoint.py")
endpoint_modules.sort(key=lambda x: x.__name__.split(".")[-1])
for em in endpoint_modules:
    app.include_router(em.router)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_, exc: IntegrityError):
    logger.exception(exc)
    if isinstance(exc.orig, UniqueViolation):
        msg = str(exc.orig.pgerror).split("\n")[1]
        return PlainTextResponse(msg, status_code=409)
    else:
        return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(NoSuchJobError)
async def no_such_job_error_handler(_, exc: NoSuchJobError):
    logger.exception(exc)
    return PlainTextResponse(str(exc), status_code=404)


# register all exception handlers in fastAPI
for ex_class, handler_func in exception_handlers:
    app.add_exception_handler(ex_class, handler_func)


def main() -> None:
    # read port from config
    port = int(conf.api.port)
    assert port is not None and isinstance(port, int) and port > 0, (
        "The API port has to be a positive integer! E.g. 8081"
    )

    is_debug = conf.api.production_mode == "0"

    run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level=conf.logging.level.lower(),
        reload=is_debug,
    )


if __name__ == "__main__":
    main()
