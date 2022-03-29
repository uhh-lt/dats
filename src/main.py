from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from loguru import logger
from uvicorn import Config, Server

from app.core.startup import startup

startup(reset_database=False)

from api.endpoints import general, project, user, source_document, code, annotation_document  # noqa E402
from app.core.data.crud.crud_base import NoSuchElementError  # noqa E402
from config import conf  # noqa E402

# create the FastAPI app
app = FastAPI(
    title="D-WISE Tool Suite Backend API",
    description="The REST API for the D-WISE Tool Suite Backend",
    version="alpha_mwp_1"
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


# add custom exception handlers
@app.exception_handler(NoSuchElementError)
async def no_such_element_error_handler(_, exc: NoSuchElementError):
    return PlainTextResponse(str(exc), status_code=404)


@app.exception_handler(NotImplementedError)
async def no_such_element_error_handler(_, exc: NotImplementedError):
    return PlainTextResponse(str(exc), status_code=501)


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting Down D-WISE Tool Suite Backend!")


# include the endpoint routers
app.include_router(general.router)
app.include_router(user.router)
app.include_router(project.router)
app.include_router(source_document.router)
app.include_router(annotation_document.router)
app.include_router(code.router)


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
            debug=True,
            reload=True
        ),
    )

    server.run()


if __name__ == "__main__":
    main()
