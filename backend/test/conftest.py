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

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from repos.redis_repo import RedisRepo


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
# INIT REPOS
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function", autouse=True)
def setup_repos() -> None:
    from repos.db.sql_repo import SQLRepo
    from repos.elastic.elastic_repo import ElasticSearchRepo
    from repos.filesystem_repo import FilesystemRepo
    from repos.vector.weaviate_repo import WeaviateRepo

    fsr = FilesystemRepo()
    fsr._create_root_directory_structure(remove_if_exists=True)

    sqlr = SQLRepo(remove_if_exists=True)
    sqlr.drop_database()

    es = ElasticSearchRepo(remove_if_exists=True)
    es.drop_indices()

    weaviate = WeaviateRepo(remove_if_exists=True)
    weaviate.drop_indices()

    redis = RedisRepo(remove_if_exists=True)
    redis.drop_database()


# ---------------------------------------------------------------------------
# DB SESSION
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function")
def db_session(setup_repos) -> Generator[Session, Any, None]:
    from sqlalchemy import text

    from repos.db.orm_base import ORMBase
    from repos.db.sql_repo import SQLRepo

    sql = SQLRepo()
    sql.create_database_if_not_exists()

    with sql.engine.begin() as conn:
        conn.execute(
            text(
                "CREATE COLLATION IF NOT EXISTS natsort "
                "(provider = icu, locale = 'und-u-kn-true');"
            )
        )

    ORMBase.metadata.create_all(sql.engine)

    session = sql.session_maker()
    try:
        yield session
    finally:
        session.close()


# ---------------------------------------------------------------------------
# WEAVIATE COLLECTIONS
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function", autouse=True)
def setup_weaviate_collections(setup_repos) -> None:
    from core.doc.document_collection import DocumentCollection
    from core.doc.image_collection import ImageCollection
    from core.doc.sentence_collection import SentenceCollection
    from modules.perspectives.aspect_collection import AspectCollection
    from modules.perspectives.cluster_collection import ClusterCollection
    from repos.vector.weaviate_repo import WeaviateRepo

    with WeaviateRepo().weaviate_session() as client:
        DocumentCollection.create_collection(client)
        SentenceCollection.create_collection(client)
        ImageCollection.create_collection(client)
        AspectCollection.create_collection(client)
        ClusterCollection.create_collection(client)


# ---------------------------------------------------------------------------
# SYSTEM USERS
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function", autouse=True)
def setup_users(db_session) -> None:
    from config import conf
    from core.user.user_crud import (
        ASSISTANT_FEWSHOT_ID,
        ASSISTANT_TRAINED_ID,
        ASSISTANT_ZEROSHOT_ID,
        crud_user,
    )
    from core.user.user_dto import UserCreate

    crud_user.create(
        db=db_session,
        create_dto=UserCreate(
            email=conf.system_user.email,
            first_name=conf.system_user.first_name,
            last_name=conf.system_user.last_name,
            password=conf.system_user.password,
        ),
    )

    domain = conf.assistant_user.email.split("@")[1]

    assistants = [
        (ASSISTANT_ZEROSHOT_ID, "ZeroShot"),
        (ASSISTANT_FEWSHOT_ID, "FewShot"),
        (ASSISTANT_TRAINED_ID, "Trained"),
    ]

    for uid, lname in assistants:
        crud_user.create_with_id(
            db=db_session,
            create_dto=UserCreate(
                email=f"assistant-{lname.lower()}@{domain}",
                first_name=conf.assistant_user.first_name,
                last_name=lname,
                password=conf.assistant_user.password,
            ),
            id=uid,
        )

    db_session.commit()


# ---------------------------------------------------------------------------
# APP
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function")
def app(db_session: Session, test_user: UserORM) -> FastAPI:
    # See main.py! This function should replicate our main.py application entrypoint!
    from fastapi import FastAPI
    from psycopg2.errors import UniqueViolation
    from sqlalchemy.exc import IntegrityError

    from common.dependencies import get_current_user
    from common.exception_handler import exception_handler, exception_handlers
    from core.user.user_crud import crud_user
    from utils.import_utils import import_by_suffix

    app = FastAPI()

    # TODO: maybe do this differently
    app.dependency_overrides[get_current_user] = lambda: crud_user.read_by_email(
        db=db_session, email=test_user.email
    )

    # import & register all endpoints dynamically
    modules = import_by_suffix("_endpoint.py")
    modules.sort(key=lambda m: m.__name__)
    for m in modules:
        app.include_router(m.router)

    # register all exception handlers in fastAPI
    from rq.exceptions import NoSuchJobError

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

    return app


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
    from core.user.user_crud import crud_user
    from core.user.user_dto import UserCreate

    user = crud_user.create(
        db=db_session,
        create_dto=UserCreate(
            first_name="Test",
            last_name="User",
            email="testuser@dats.org",
            password="MyTestPassword123",
        ),
    )

    db_session.commit()
    db_session.refresh(user)

    return user


@pytest.fixture(scope="function")
def test_project(db_session, test_user) -> ProjectORM:
    """Create a project for the test user"""
    from core.project.project_dto import ProjectCreate
    from core.project.project_service import ProjectService

    project_dto = ProjectCreate(
        title="Simple Test Project",
        description="A simple project for testing",
    )

    ps = ProjectService()
    project = ps.create_project(
        db=db_session,
        create_dto=project_dto,
        creating_user_id=test_user.id,
    )

    db_session.commit()
    db_session.refresh(project)

    return project
