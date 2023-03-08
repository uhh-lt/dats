import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.routing import APIRoute
from loguru import logger
from psycopg2.errors import UniqueViolation
from sqlalchemy.exc import IntegrityError
from uvicorn import Config, Server

from app.core.startup import startup

# Flo: just do it once. We have to check because if we start the main function, unvicorn will import this
# file once more manually, so it would be executed twice.
STARTUP_DONE = bool(int(os.environ.get('STARTUP_DONE', '0')))
if not STARTUP_DONE:
    startup(reset_data=False)
    os.environ['STARTUP_DONE'] = "1"

from app.core.data.crud.source_document import SourceDocumentPreprocessingUnfinishedError
from app.core.data.repo.repo_service import RepoService, SourceDocumentNotFoundInRepositoryError, \
    FileNotFoundInRepositoryError  # noqa E402
from app.core.search.elasticsearch_service import NoSuchSourceDocumentInElasticSearchError, \
    NoSuchMemoInElasticSearchError  # noqa E402
from app.core.data.export.export_service import ExportJobPreparationError, NoDataToExportError, NoSuchExportJobError
from api.endpoints import general, project, user, source_document, code, annotation_document, memo, \
    span_annotation, document_tag, span_group, bbox_annotation, search, metadata, feedback, analysis, \
    prepro, export  # noqa E402
from app.core.data.crud.crud_base import NoSuchElementError  # noqa E402
from config import conf  # noqa E402


# custom method to generate OpenApi function names
def custom_generate_unique_id(route: APIRoute):
    return f"{route.tags[0]}-{route.name}"

# create the FastAPI app
app = FastAPI(
    title="D-WISE Tool Suite Backend API",
    description="The REST API for the D-WISE Tool Suite Backend",
    version="alpha_mwp_1",
    generate_unique_id_function=custom_generate_unique_id
)

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


# add custom exception handlers
# TODO Flo: find a better place for this! (and Exceptions in general. move into own file)
@app.exception_handler(NoSuchElementError)
async def no_such_element_error_handler(_, exc: NoSuchElementError):
    return PlainTextResponse(str(exc), status_code=404)


@app.exception_handler(NoDataToExportError)
async def no_data_to_export_handler(_, exc: NoDataToExportError):
    return PlainTextResponse(str(exc), status_code=404)


@app.exception_handler(NoSuchExportJobError)
async def no_such_export_job_handler(_, exc: NoSuchExportJobError):
    return PlainTextResponse(str(exc), status_code=404)


@app.exception_handler(ExportJobPreparationError)
async def export_job_preparation_error_handler(_, exc: ExportJobPreparationError):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(NoSuchSourceDocumentInElasticSearchError)
async def no_such_sdoc_in_es_error_handler(_, exc: NoSuchSourceDocumentInElasticSearchError):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(NoSuchMemoInElasticSearchError)
async def no_such_memo_in_es_error_handler(_, exc: NoSuchMemoInElasticSearchError):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(SourceDocumentNotFoundInRepositoryError)
async def source_document_not_found_in_repository_error_handler(_, exc: SourceDocumentNotFoundInRepositoryError):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(SourceDocumentPreprocessingUnfinishedError)
async def source_document_preprocessing_unfinished_error_handler(_, exc: SourceDocumentPreprocessingUnfinishedError):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(FileNotFoundInRepositoryError)
async def file_not_found_in_repository_error_handler(_, exc: FileNotFoundInRepositoryError):
    return PlainTextResponse(str(exc), status_code=500)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_, exc: IntegrityError):
    if isinstance(exc.orig, UniqueViolation):
        msg = str(exc.orig.pgerror).split("\n")[1]
        return PlainTextResponse(msg, status_code=409)
    else:
        return PlainTextResponse(str(exc), status_code=500)


@app.on_event("startup")
async def startup_event():
    logger.info("Starting D-WISE Tool Suite FastAPI!")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Stopping D-WISE Tool Suite FastAPI!")
    RepoService().purge_temporary_files()


# include the endpoint routers
app.include_router(general.router)
app.include_router(user.router)
app.include_router(project.router)
app.include_router(source_document.router)
app.include_router(document_tag.router)
app.include_router(annotation_document.router)
app.include_router(span_annotation.router)
app.include_router(span_group.router)
app.include_router(bbox_annotation.router)
app.include_router(code.router)
app.include_router(memo.router)
app.include_router(search.router)
app.include_router(metadata.router)
app.include_router(feedback.router)
app.include_router(analysis.router)
app.include_router(prepro.router)
app.include_router(export.router)


def main() -> None:
    # read port from config
    port = int(conf.api.port)
    assert port is not None and isinstance(port, int) and port > 0, \
        "The API port has to be a positive integer! E.g. 8081"

    server = Server(
        Config(
            "main:app",
            host="0.0.0.0",
            port=port,
            log_level=conf.logging.level.lower(),
            # debug=True,
            reload=True
        ),
    )

    server.run()


if __name__ == "__main__":
    main()
