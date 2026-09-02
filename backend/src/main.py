# ignore unorganized imports for this file
# ruff: noqa: E402

import asyncio
import inspect
import json
import os
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.routing import APIRoute
from loguru import logger
from psycopg2.errors import UniqueViolation
from rq.exceptions import NoSuchJobError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware
from websocket import manager

from common.dependencies import (
    get_current_user,
    get_db_session,
)
from config import conf
from repos.repo_base import RepoBase
from utils.import_utils import import_by_suffix
from utils.logger import setup_logging

setup_logging()


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

    # Find all repos dynamically
    repos: list[RepoBase] = []
    repo_modules = import_by_suffix("_repo.py")
    repo_modules.sort(key=lambda x: x.__name__.split(".")[-1])
    for module in repo_modules:
        for name, cls in inspect.getmembers(module, inspect.isclass):
            if (
                issubclass(cls, RepoBase)  # 1. Must inherit from RepoBase
                and cls is not RepoBase  # 2. Must not be the base class itself
                and cls.__module__ == module.__name__  # 3. Must be defined in THIS file
            ):
                repo_instance = cls()
                repos.append(repo_instance)

    # Setup repos lazily
    for repo in repos:
        repo.connect()

    # Setup services lazily
    from systems.job_system.job_service import JobService

    JobService().initialize()

    yield

    # --- Worker Shutdown ---
    logger.info(f"Worker {os.getpid()} stopping. Cleaning up resources...")

    from repos.filesystem_repo import FilesystemRepo

    FilesystemRepo().purge_temporary_files()

    # Close all repo connections
    for repo in repos:
        repo.close_connection()


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


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket, db: Session = Depends(get_db_session)
):
    await websocket.accept()
    try:
        # Wait up to 5 seconds for the authentication message
        auth_message = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
        token = auth_message.get("token")

        if not token:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION, reason="Missing token"
            )
            return
        current_user = get_current_user(db, token)

    except (asyncio.TimeoutError, json.JSONDecodeError, Exception):
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed"
        )
        return

    await manager.connect(websocket, current_user.id)
    logger.info(f"User {current_user.id} connected to WebSocket.")
    try:
        while True:
            data = await websocket.receive_text()  # noqa: F841
    except WebSocketDisconnect:
        manager.disconnect(websocket, current_user.id)


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
