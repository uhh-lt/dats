# ignore unorganized imports for this file
# ruff: noqa: E402

import os
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.routing import APIRoute
from loguru import logger
from psycopg2.errors import UniqueViolation
from rq.exceptions import NoSuchJobError
from sqlalchemy.exc import IntegrityError
from starlette.middleware.sessions import SessionMiddleware

from config import conf
from utils.import_utils import import_by_suffix

# 1. Init Sentry
if conf.glitchtip.dsn_backend.strip() != "":
    sentry_sdk.init(
        dsn=conf.glitchtip.dsn_backend,
        auto_session_tracking=False,
        traces_sample_rate=0.01 if conf.api.production_mode == 1 else 1.0,
        enable_logs=True,
        environment="production" if conf.api.production_mode == 1 else "development",
        release=conf.api.version,
    )
    logger.info("Connected to GlitchTip using Sentry SDK!")
else:
    logger.info("No GlitchTip DSN provided. Skipping Sentry SDK connection.")


# 2. Init FastAPI
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Worker Startup ---
    logger.info(f"Worker {os.getpid()} starting Discourse Analysis Tool Suite FastAPI!")

    # Connect to repos (external services)
    from repos.db.sql_repo import SQLRepo
    from repos.docling_repo import DoclingRepo
    from repos.elastic.elastic_repo import ElasticSearchRepo
    from repos.filesystem_repo import FilesystemRepo
    from repos.llm_repo import LLMRepo
    from repos.mail_repo import MailRepo
    from repos.ray.ray_repo import RayRepo
    from repos.redis_repo import RedisRepo
    from repos.vector.weaviate_repo import WeaviateRepo

    SQLRepo()
    ElasticSearchRepo()
    RayRepo()
    WeaviateRepo()
    DoclingRepo()
    FilesystemRepo()
    LLMRepo()
    MailRepo()
    RedisRepo()

    yield

    # --- Worker Shutdown ---
    logger.info(f"Worker {os.getpid()} stopping. Cleaning up resources...")
    FilesystemRepo().purge_temporary_files()
    LLMRepo().close_connection()
    ElasticSearchRepo().close_connection()


def custom_generate_unique_id(route: APIRoute):
    return f"{route.tags[0]}-{route.name}"


app = FastAPI(
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=lifespan,
    title="Discourse Analysis Tool Suite API",
    version=conf.api.version,
)

# 3. Add Middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:8080", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(SessionMiddleware, secret_key=conf.auth.session.secret)

# 4. Dynamically Include Endpoints
import_by_suffix("_job.py")
endpoint_modules = import_by_suffix("_endpoint.py")
endpoint_modules.sort(key=lambda x: x.__name__.split(".")[-1])
for em in endpoint_modules:
    app.include_router(em.router)

# 5. Dynamically Register Exception Handlers
from common.exception_handler import exception_handler, exception_handlers

exception_handler(
    http_status_code=lambda exc: (
        409
        if isinstance(exc, IntegrityError) and isinstance(exc.orig, UniqueViolation)
        else 500
    ),
    extract_message=lambda exc: (
        str(exc.orig.pgerror).split("\n")[1]
        if isinstance(exc, IntegrityError) and isinstance(exc.orig, UniqueViolation)
        else str(exc)
    ),
)(IntegrityError)

exception_handler(404)(NoSuchJobError)

for ex_class, handler_func in exception_handlers:
    app.add_exception_handler(ex_class, handler_func)
