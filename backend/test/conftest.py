# The test environment must be set before DATS is imported
# ruff: noqa: E402
import os

# ---------------------------------------------------------------------------
# SETUP TEST ENVIRONMENT
# ---------------------------------------------------------------------------

# The environment of the developer setup, before the test overrides below:
DEVELOPER_ENVIRONMENT = dict(os.environ)

# Use databases different from production / development for testing:
os.environ["FILESYSTEM_ROOT_DIRECTORY"] = "docker/test_repo"
os.environ["WEAVIATE_COLLECTION_POSTFIX"] = "test"
os.environ["POSTGRES_DB"] = "datstest"
os.environ["REDIS_INDEX"] = "9"
os.environ["REDIS_WS_INDEX"] = "12"
os.environ["REDIS_WS_FANOUT_CHANNEL"] = "dats:ws:fanout:test"
os.environ["ES_INDEX_PREFIX"] = "datstest"

# Use one worker per type for testing:
os.environ["RQ_WORKERS_CPU"] = "1"
os.environ["RQ_WORKERS_API"] = "1"
os.environ["RQ_WORKERS_GPU"] = "1"

from typing import Any, Generator

import dats_test_utils
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM

# Never touch the developer's data: check before any fixture resets a data store
try:
    dats_test_utils.assert_isolated_from(DEVELOPER_ENVIRONMENT)
except RuntimeError as e:
    pytest.exit(str(e), returncode=1)


# ---------------------------------------------------------------------------
# START WORKERS
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def start_workers() -> Generator[None, Any, Any]:
    import multiprocessing as mp
    import sys
    import time

    from worker import do_healthcheck, do_work

    # 1. start worker in a subprocess
    ctx = mp.get_context("fork")
    worker = ctx.Process(target=do_work, args=["dev"])
    worker.start()
    print("Starting worker! Waiting for it to be healthy...")

    # 2. Give the worker time to start
    time.sleep(10)

    # 3. Wait until worker is healthy (5 tries)
    is_healthy = False
    num_try = 0
    while not is_healthy and num_try < 5:
        time.sleep(10)
        try:
            num_try += 1
            do_healthcheck()
        except SystemExit as e:
            is_healthy = e.code == 0

    if not is_healthy:
        print("Worker is not healthy! Exiting test...")
        worker.terminate()
        worker.join()
        sys.exit(1)

    # 4. Run tests
    yield None

    # 5. Stop workers
    worker.terminate()
    worker.join()


# ---------------------------------------------------------------------------
# DATA STORES
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def start_dats() -> None:
    dats_test_utils.start_dats()


@pytest.fixture(scope="function", autouse=True)
def clean_data_stores(start_dats) -> None:
    dats_test_utils.clean_data_stores()


# ---------------------------------------------------------------------------
# DB SESSION
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function")
def db_session(clean_data_stores) -> Generator[Session, Any, None]:
    from repos.db.sql_repo import SQLRepo

    with SQLRepo().transaction() as db:
        yield db


# ---------------------------------------------------------------------------
# APP & CLIENTS
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def app() -> FastAPI:
    return dats_test_utils.create_test_app()


@pytest.fixture(scope="session")
def app_client(app: FastAPI) -> Generator[TestClient, Any, None]:
    """Runs the app's lifespan once for the whole test session, like a server
    process. Send requests with the user clients, not with this one."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="function")
def client(
    app_client: TestClient, test_user: UserORM
) -> Generator[TestClient, Any, None]:
    """A client that sends its requests as the test user."""
    c = dats_test_utils.create_user_client(app_client, test_user)
    yield c
    c.close()


# ---------------------------------------------------------------------------
# GENERIC TEST SETUP FIXTURES
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function")
def test_user(db_session) -> UserORM:
    """Create a test user."""
    return dats_test_utils.create_test_user(db_session)


@pytest.fixture(scope="function")
def test_project(db_session, test_user) -> ProjectORM:
    """Create a project for the test user"""
    return dats_test_utils.create_test_project(db_session, test_user)


@pytest.fixture(scope="function")
def project_with_sdoc(db_session, test_project) -> dats_test_utils.ProjectWithSdoc:
    """Create a project for the test user with a source document."""
    return dats_test_utils.create_project_with_sdoc(db_session, test_project)
