import os

# ---------------------------------------------------------------------------
# SETUP TEST ENVIRONMENT
# ---------------------------------------------------------------------------

# Use databases different from production / development for testing:
os.environ["FILESYSTEM_ROOT_DIRECTORY"] = "docker/test_repo"
os.environ["WEAVIATE_COLLECTION_POSTFIX"] = "test"
os.environ["POSTGRES_DB"] = "datstest"
os.environ["REDIS_INDEX"] = "9"
os.environ["ES_INDEX_PREFIX"] = "datstest"

# Use one worker per type for testing:
os.environ["RQ_WORKERS_CPU"] = "1"
os.environ["RQ_WORKERS_API"] = "1"
os.environ["RQ_WORKERS_GPU"] = "1"

from typing import Any, Generator

import dats_setup_utils
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM


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
# INIT POSTGRES DB
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def init_postgres() -> None:
    """Before running tests, nuke the PostgreSQL database and create a new one."""
    from repos.db.sql_repo import SQLRepo

    sqlr = SQLRepo()
    sqlr.connect()
    sqlr.drop_database()
    sqlr.create_database_if_not_exists()


# ---------------------------------------------------------------------------
# INIT REPOS
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function", autouse=True)
def setup_repos(init_postgres) -> None:
    dats_setup_utils.setup_repos()


# ---------------------------------------------------------------------------
# DB SESSION
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function")
def db_session(setup_repos) -> Generator[Session, Any, None]:
    from repos.db.sql_repo import SQLRepo

    with SQLRepo().transaction() as db:
        yield db


# ---------------------------------------------------------------------------
# WEAVIATE COLLECTIONS
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function", autouse=True)
def setup_weaviate_collections(setup_repos) -> None:
    dats_setup_utils.create_weaviate_collections()


# ---------------------------------------------------------------------------
# SYSTEM USERS
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function", autouse=True)
def setup_users(db_session) -> None:
    dats_setup_utils.create_system_users(db_session)


# ---------------------------------------------------------------------------
# APP
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function")
def app(db_session: Session, test_user: UserORM) -> FastAPI:
    # See main.py! This function should replicate our main.py application entrypoint!
    return dats_setup_utils.build_app(db_session, test_user)


# ---------------------------------------------------------------------------
# CLIENT
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function")
def client(app):
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# GENERIC TEST SETUP FIXTURES
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function")
def test_user(db_session) -> UserORM:
    """Create a test user."""
    return dats_setup_utils.create_test_user(db_session)


@pytest.fixture(scope="function")
def test_project(db_session, test_user) -> ProjectORM:
    """Create a project for the test user"""
    return dats_setup_utils.create_test_project(db_session, test_user)


@pytest.fixture(scope="function")
def project_with_sdoc(db_session, test_project) -> dats_setup_utils.ProjectWithSdoc:
    """Create a project for the test user with a source document."""
    return dats_setup_utils.create_project_with_sdoc(db_session, test_project)
