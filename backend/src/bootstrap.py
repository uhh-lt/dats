"""Startup of DATS, shared by all entry points.

Every entry point composes the same functions, so the startup of the API, the
workers, the setup script and the tests cannot drift apart:

| Entry point                  | Functions                                                  |
| ---------------------------- | ---------------------------------------------------------- |
| `main.py` (API)              | init_logging, create_app                                   |
| `worker.py` (job processes)  | init_logging, register_jobs, connect_repos, init_services  |
| `setup.py`                   | init_logging, setup_data_stores                            |
| `run_migrations.py`          | init_logging, migrate_database                             |
| `test/conftest.py`           | connect_repos, init_services, delete_all_data,             |
|                              | ensure_system_data, create_app                             |

All functions are idempotent, so calling one twice in a process is safe.
"""

import inspect
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.routing import APIRoute
from loguru import logger
from sqlalchemy.orm import Session

from config import conf
from repos.repo_base import RepoBase
from utils.import_utils import import_by_suffix
from utils.logger import setup_logging


# ==============================================================================
# LOGGING
# ==============================================================================
def init_logging(*, with_sentry: bool = False) -> None:
    """Set up logging for this process, and optionally error reporting to Sentry."""
    setup_logging()
    if with_sentry:
        _init_sentry()


def _init_sentry() -> None:
    if conf.glitchtip.dsn_backend.strip() == "":
        logger.info("No GlitchTip DSN provided. Skipping Sentry SDK connection.")
        return

    import sentry_sdk

    sentry_sdk.init(
        dsn=conf.glitchtip.dsn_backend,
        auto_session_tracking=False,
        traces_sample_rate=0.01 if conf.api.production_mode == 1 else 1.0,
        enable_logs=True,
        environment="production" if conf.api.production_mode == 1 else "development",
        release=conf.api.version,
    )
    logger.info("Connected to GlitchTip using Sentry SDK!")


# ==============================================================================
# JOBS
# ==============================================================================
def register_jobs() -> None:
    """Register all jobs (by importing the `*_job.py` modules) and build the
    JOB_UPDATED event model, which needs all jobs registered.

    Must run before any endpoint is imported: the job endpoints are generated
    on registration.
    """
    from common.dats_event import build_job_event_models

    import_by_suffix("_job.py")
    build_job_event_models()


# ==============================================================================
# REPOS & SERVICES
# ==============================================================================
def connect_repos() -> list[RepoBase]:
    """Connect all repos (every `RepoBase` in a `*_repo.py` module). Returns them,
    so the caller can close them again."""
    logger.info(f"Process {os.getpid()} connecting all repositories...")
    repos = _discover_repos()
    for repo in repos:
        repo.connect()
    return repos


def close_repos(repos: list[RepoBase]) -> None:
    """Close the connections of the given repos (never raises)."""
    logger.info(f"Process {os.getpid()} closing repository connections...")
    for repo in repos:
        try:
            repo.close_connection()
        except Exception as e:
            logger.error(f"Failed to close {repo.__class__.__name__}: {e}")


async def aclose_repos(repos: list[RepoBase]) -> None:
    """Like `close_repos`, but first awaits the async closes, while the event
    loop is still running."""
    for repo in repos:
        aclose = getattr(repo, "aclose_connection", None)
        if aclose is None:
            continue
        try:
            await aclose()
        except Exception as e:
            logger.error(f"Failed to close {repo.__class__.__name__}: {e}")
    close_repos(repos)


def init_services() -> None:
    """Initialize the services that need connected repos (the JobService creates
    its Redis queues)."""
    from systems.job_system.job_service import JobService

    JobService().initialize()


def _discover_repos() -> list[RepoBase]:
    repos: list[RepoBase] = []
    repo_modules = import_by_suffix("_repo.py")
    repo_modules.sort(key=lambda module: module.__name__.split(".")[-1])
    for module in repo_modules:
        for _, cls in inspect.getmembers(module, inspect.isclass):
            if (
                issubclass(cls, RepoBase)
                and cls is not RepoBase
                and cls.__module__ == module.__name__
            ):
                repos.append(cls())
    return repos


# ==============================================================================
# DATA STORES (database, filesystem, Elasticsearch, Weaviate, Redis)
# ==============================================================================
def setup_data_stores(
    *, delete_existing_data: bool = False, sql_echo: bool = False
) -> None:
    """Prepare all data stores for DATS: migrate the database and create the
    system data. Connects only the data store repos, and closes them again.

    Args:
        delete_existing_data: Delete all existing data first.
        sql_echo: Log all SQL statements.
    """
    repos = _data_store_repos(sql_echo=sql_echo)
    for repo in repos:
        repo.connect()

    migrate_database()
    if delete_existing_data:
        delete_all_data()
    ensure_system_data()

    close_repos(repos)


def migrate_database() -> None:
    """Create the database if it does not exist and migrate it to the latest
    revision."""
    from alembic.command import upgrade
    from alembic.config import Config

    from repos.db.sql_repo import SQLRepo

    sql_repo = SQLRepo()
    sql_repo.connect()
    sql_repo.create_database_if_not_exists()

    logger.info("Running Database Migrations...")
    config = Config(os.path.join(os.path.dirname(__file__), "migrations/alembic.ini"))
    # Keep our logging setup (env.py would replace it with alembic.ini's)
    config.attributes["configure_logger"] = False
    upgrade(config, "head")
    logger.info("Database Migrations Completed Successfully!")


def delete_all_data() -> None:
    """Delete all data from all data stores, keeping the database schema.
    Requires connected repos."""
    for repo in _data_store_repos():
        repo.remove_data()


def ensure_system_data() -> None:
    """Create the data every DATS instance needs, unless it exists: the
    filesystem structure, the system users and the Weaviate collections.
    Requires connected repos."""
    from repos.db.sql_repo import SQLRepo
    from repos.filesystem_repo import FilesystemRepo

    FilesystemRepo()._create_root_directory_structure(remove_if_exists=False)
    with SQLRepo().transaction() as db:
        _create_system_users(db=db)
    _create_weaviate_collections()


def _data_store_repos(*, sql_echo: bool = False) -> list[RepoBase]:
    from repos.async_redis_repo import AsyncRedisRepo
    from repos.db.sql_repo import SQLRepo
    from repos.elastic.elastic_repo import ElasticSearchRepo
    from repos.filesystem_repo import FilesystemRepo
    from repos.redis_repo import RedisRepo
    from repos.vector.weaviate_repo import WeaviateRepo

    return [
        FilesystemRepo(),
        SQLRepo(echo=sql_echo),
        ElasticSearchRepo(),
        WeaviateRepo(),
        RedisRepo(),
        AsyncRedisRepo(),
    ]


def _create_system_users(db: Session) -> None:
    from core.user.user_crud import (
        ASSISTANT_FEWSHOT_ID,
        ASSISTANT_TRAINED_ID,
        ASSISTANT_ZEROSHOT_ID,
        DEMO_USER_ID,
        SYSTEM_USER_ID,
        crud_user,
    )
    from core.user.user_dto import UserCreate

    # The system and demo users get their ids from the sequence: create them
    # first and in this order.
    for user_id, user_conf in [
        (SYSTEM_USER_ID, conf.system_user),
        (DEMO_USER_ID, conf.demo_user),
    ]:
        if crud_user.exists(db=db, id=user_id):
            continue
        logger.info(f"Creating User: {user_conf.email}")
        crud_user.create(
            db=db,
            create_dto=UserCreate(
                email=user_conf.email,
                first_name=user_conf.first_name,
                last_name=user_conf.last_name,
                password=user_conf.password.get_secret_value(),
            ),
        )

    domain = conf.assistant_user.email.split("@")[1]
    for user_id, last_name in [
        (ASSISTANT_ZEROSHOT_ID, "ZeroShot"),
        (ASSISTANT_FEWSHOT_ID, "FewShot"),
        (ASSISTANT_TRAINED_ID, "Trained"),
    ]:
        if crud_user.exists(db=db, id=user_id):
            continue
        logger.info(f"Creating Assistant User: {last_name}")
        crud_user.create_with_id(
            db=db,
            create_dto=UserCreate(
                email=f"assistant-{last_name.lower()}@{domain}",
                first_name=conf.assistant_user.first_name,
                last_name=last_name,
                password=conf.assistant_user.password.get_secret_value(),
            ),
            id=user_id,
        )


def _create_weaviate_collections() -> None:
    from repos.vector.collection_base import BaseCollection
    from repos.vector.weaviate_repo import WeaviateRepo

    client = WeaviateRepo().get_client()
    for collection in BaseCollection.all_collections():
        collection.create_collection(client)


# ==============================================================================
# APP
# ==============================================================================
def create_app() -> FastAPI:
    """Create the DATS FastAPI application: endpoints, websocket event
    webhooks, exception handlers, middlewares and the MCP server. Its lifespan
    connects the repos, initializes the services and runs the websocket service."""
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.middleware.gzip import GZipMiddleware
    from starlette.middleware.sessions import SessionMiddleware

    register_jobs()

    app = FastAPI(
        generate_unique_id_function=_generate_unique_id,
        lifespan=_lifespan,
        title="Discourse Analysis Tool Suite API",
        version=conf.api.version,
    )

    # Middlewares
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost", "http://localhost:8080", "*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=500)
    app.add_middleware(SessionMiddleware, secret_key=conf.auth.session.secret)

    # Endpoints
    for endpoint_module in import_by_suffix("_endpoint.py"):
        app.include_router(endpoint_module.router)

    # Websocket events as OpenAPI webhooks, so they appear in openapi.json
    from common.dats_event import DATS_EVENT_TO_MODEL

    for event_type, event_cls in DATS_EVENT_TO_MODEL.items():
        app.webhooks.post(
            event_type.value,
            operation_id=f"ws_{event_type.value.lower()}",
            response_model=event_cls,
        )(_webhook_handler)

    # Exception handlers
    from common.exception_handler import exception_handlers

    _register_library_exception_handlers()
    for exception_class, handler in exception_handlers:
        app.add_exception_handler(exception_class, handler)

    # MCP server (wraps the lifespan, so it must come last)
    from systems.mcp_system.mcp_server import mcp_run

    mcp_run(app=app, lifespan=_lifespan)

    return app


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    from repos.filesystem_repo import FilesystemRepo
    from systems.websocket_system.websocket_service import WebsocketService

    logger.info(f"Worker {os.getpid()} starting Discourse Analysis Tool Suite API!")
    repos = connect_repos()
    init_services()
    websocket_service = WebsocketService()
    await websocket_service.startup()

    yield

    logger.info(f"Worker {os.getpid()} stopping. Cleaning up resources...")
    await websocket_service.shutdown()
    FilesystemRepo().purge_temporary_files()
    await aclose_repos(repos)


def _generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


def _webhook_handler() -> None:  # no body; the event schema is the response_model
    return None


_library_exception_handlers_registered = False


def _register_library_exception_handlers() -> None:
    """Register the handlers for exceptions of third-party libraries (once,
    `exception_handler` appends to a global list)."""
    global _library_exception_handlers_registered
    if _library_exception_handlers_registered:
        return

    from psycopg2.errors import UniqueViolation
    from rq.exceptions import NoSuchJobError
    from sqlalchemy.exc import IntegrityError

    from common.exception_handler import exception_handler

    def _is_unique_violation(exc: Exception) -> bool:
        return isinstance(exc, IntegrityError) and isinstance(exc.orig, UniqueViolation)

    exception_handler(
        http_status_code=lambda exc: 409 if _is_unique_violation(exc) else 500,
        extract_message=lambda exc: (
            str(exc.orig.pgerror).split("\n")[1]  # type: ignore[attr-defined]
            if _is_unique_violation(exc)
            else str(exc)
        ),
    )(IntegrityError)
    exception_handler(404)(NoSuchJobError)
    _library_exception_handlers_registered = True
