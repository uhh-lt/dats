# ignore unorganized imports for this file
# ruff: noqa: E402

import os
from contextlib import asynccontextmanager
from http import HTTPStatus

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import PlainTextResponse
from fastapi.routing import APIRoute
from loguru import logger
from modules.crawler.crawler_exceptions import NoDataToCrawlError
from psycopg2.errors import UniqueViolation
from repos.elastic.elastic_crud_base import NoSuchObjectInElasticSearchError
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.ollama_repo import OllamaRepo
from sqlalchemy.exc import IntegrityError
from starlette.middleware.sessions import SessionMiddleware
from utils.import_utils import import_by_suffix
from uvicorn.main import run

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

from config import conf
from core.auth.authz_user import ForbiddenError
from core.auth.validation import InvalidError
from core.doc.source_document_crud import SourceDocumentPreprocessingUnfinishedError
from modules.eximport.export_service import (
    ExportJobPreparationError,
    NoSuchExportJobError,
)
from modules.eximport.import_service import ImportJobPreparationError
from modules.eximport.no_data_export_error import NoDataToExportError
from repos.db.crud_base import NoSuchElementError
from repos.filesystem_repo import (
    FileAlreadyExistsInFilesystemError,
    FileNotFoundInFilesystemError,
    FilesystemRepo,
    SourceDocumentNotFoundInFilesystemError,
)

# import all jobs dynamically
import_by_suffix("_jobs.py")


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
    OllamaRepo().close_connection()
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


# add custom exception handlers
# TODO Flo: find a better place for this! (and Exceptions in general. move into own file)
@app.exception_handler(NoSuchElementError)
async def no_such_element_error_handler(_, exc: NoSuchElementError):
    return PlainTextResponse(str(exc), status_code=404)


@app.exception_handler(NoDataToCrawlError)
async def no_data_to_crawl_handler(_, exc: NoDataToCrawlError):
    return PlainTextResponse(str(exc), status_code=400)


@app.exception_handler(NoDataToExportError)
async def no_data_to_export_handler(_, exc: NoDataToExportError):
    return PlainTextResponse(str(exc), status_code=404)


@app.exception_handler(NoSuchExportJobError)
async def no_such_export_job_handler(_, exc: NoSuchExportJobError):
    return PlainTextResponse(str(exc), status_code=404)


@app.exception_handler(ExportJobPreparationError)
async def export_job_preparation_error_handler(_, exc: ExportJobPreparationError):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(ImportJobPreparationError)
async def import_job_preparation_error_handler(_, exc: ImportJobPreparationError):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(NoSuchObjectInElasticSearchError)
async def no_such_object_in_es_error_handler(_, exc: NoSuchObjectInElasticSearchError):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(SourceDocumentNotFoundInFilesystemError)
async def source_document_not_found_in_filesystem_error_handler(
    _, exc: SourceDocumentNotFoundInFilesystemError
):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(SourceDocumentPreprocessingUnfinishedError)
async def source_document_preprocessing_unfinished_error_handler(
    _, exc: SourceDocumentPreprocessingUnfinishedError
):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(FileNotFoundInFilesystemError)
async def file_not_found_in_filesystem_error_handler(
    _, exc: FileNotFoundInFilesystemError
):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(FileAlreadyExistsInFilesystemError)
async def file_already_exists_in_filesystem_error_handler(
    _, exc: FileAlreadyExistsInFilesystemError
):
    return PlainTextResponse(str(exc), status_code=406)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_, exc: IntegrityError):
    if isinstance(exc.orig, UniqueViolation):
        msg = str(exc.orig.pgerror).split("\n")[1]
        return PlainTextResponse(msg, status_code=409)
    else:
        return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(ForbiddenError)
def forbidden_error_handler(_, exc: ForbiddenError):
    return PlainTextResponse(str(exc), status_code=403)


@app.exception_handler(InvalidError)
def invalid_error_handler(_, exc: InvalidError):
    return PlainTextResponse(str(exc), status_code=HTTPStatus.BAD_REQUEST)


# import & register all exception handlers dynamically
exception_hanlders = import_by_suffix("_exception_handler.py")
for eh in exception_hanlders:
    eh.register_exception_handlers(app)

# import & register all endpoints dynamically
endpoint_modules = import_by_suffix("_endpoint.py")
endpoint_modules.sort(key=lambda x: x.__name__.split(".")[-1])
for em in endpoint_modules:
    app.include_router(em.router)


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
