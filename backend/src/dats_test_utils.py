"""Test-only helpers for the DATS test suites.

The tests boot DATS with the same building blocks as production (see
`bootstrap.py`). This module only holds what is specific to testing: the
isolation guard, the authenticated test clients and the factories for the
generic test data. It lives in `src/` because pytest runs with
`--import-mode=importlib`, so the conftests cannot import modules from `test/`.
"""

import json
import os
import subprocess
import sys
from collections.abc import Mapping
from pathlib import Path
from typing import Any, Generator, TypedDict

from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from common.doc_type import DocType
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM

# The tests authenticate with this header instead of a JWT (see `install_test_auth`)
TEST_USER_HEADER = "x-dats-test-user"


# ==============================================================================
# ISOLATION
# ==============================================================================
def assert_isolated_from(developer_environment: Mapping[str, str]) -> None:
    """Raise unless the test configuration is isolated from the developer setup.

    The tests share the data services (PostgreSQL, Redis, Elasticsearch,
    Weaviate, filesystem) with the developer's dev servers and wipe their data
    before every test. This compares the test configuration with the one the
    developer's environment (`developer_environment`, the environment before
    the test overrides) produces, and fails if the tests could read, wipe or
    publish into the developer's data.
    """
    from config import conf

    test = json.loads(conf.model_dump_json())
    developer = _load_config(developer_environment)
    problems: list[str] = []

    # PostgreSQL: the tests drop their whole database
    if test["postgres"]["db"] == developer["postgres"]["db"]:
        problems.append(f"PostgreSQL database '{test['postgres']['db']}' is shared")

    # Redis: the tests flush their DB indices. Pub/sub channels are global to the
    # Redis server (the DB index does not isolate them), so the websocket fan-out
    # channel needs a name of its own.
    test_redis, developer_redis = test["redis"], developer["redis"]
    test_indices = {test_redis["rq_idx"], test_redis["ws_idx"]}
    developer_indices = {developer_redis["rq_idx"], developer_redis["ws_idx"]}
    if len(test_indices) != 2:
        problems.append("Redis RQ and websocket DB indices of the tests are equal")
    if test_indices & developer_indices:
        problems.append(
            f"Redis DB indices {sorted(test_indices & developer_indices)} are shared"
        )
    if test_redis["ws_fanout_channel"] == developer_redis["ws_fanout_channel"]:
        problems.append(
            f"Redis websocket channel '{test_redis['ws_fanout_channel']}' is shared"
        )

    # Elasticsearch: the tests delete all indices matching `<prefix>_*`
    test_prefix = test["elasticsearch"]["index_prefix"] + "_"
    developer_prefix = developer["elasticsearch"]["index_prefix"] + "_"
    if developer_prefix.startswith(test_prefix):
        problems.append(
            f"Elasticsearch index pattern '{test_prefix}*' matches the developer indices"
        )

    # Weaviate: the tests delete all collections whose name ends with their
    # postfix (or ALL collections without a postfix)
    test_postfix = test["weaviate"]["collection_postfix"]
    developer_postfix = developer["weaviate"]["collection_postfix"]
    if not test_postfix:
        problems.append("Weaviate collection postfix of the tests is empty")
    elif developer_postfix.endswith(test_postfix):
        problems.append(
            f"Weaviate collection postfix '{test_postfix}' matches the developer "
            f"postfix '{developer_postfix}'"
        )

    # Filesystem: the tests delete their whole root directory
    test_root = Path(test["filesystem"]["root_directory"]).resolve()
    developer_root = Path(developer["filesystem"]["root_directory"]).resolve()
    if test_root.is_relative_to(developer_root) or developer_root.is_relative_to(
        test_root
    ):
        problems.append(
            f"Filesystem roots '{test_root}' and '{developer_root}' overlap"
        )

    if problems:
        raise RuntimeError(
            "The test setup is NOT isolated from the developer setup:\n- "
            + "\n- ".join(problems)
        )


def _load_config(environment: Mapping[str, str]) -> dict[str, Any]:
    """Load the DATS configuration for `environment` in a fresh interpreter."""
    src_dir = str(Path(__file__).resolve().parent)
    env = dict(environment)
    env["PYTHONPATH"] = os.pathsep.join(
        [src_dir, *filter(None, [env.get("PYTHONPATH")])]
    )
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "from config import conf; print(conf.model_dump_json())",
        ],
        env=env,
        capture_output=True,
        encoding="utf-8",
        check=True,
    )
    return json.loads(result.stdout.strip().splitlines()[-1])


# ==============================================================================
# DATABASE
# ==============================================================================
def recreate_test_database() -> None:
    """Drop the test database and create it again from the migrations."""
    from bootstrap import migrate_database
    from repos.db.sql_repo import SQLRepo

    sql_repo = SQLRepo()
    sql_repo.connect()
    sql_repo.drop_database()
    migrate_database()


# ==============================================================================
# CLIENTS
# ==============================================================================
def install_test_auth(app: FastAPI) -> None:
    """Authenticate the requests by the email in the `TEST_USER_HEADER` header
    instead of a JWT.

    The user is resolved through a FRESH transaction per request (exactly like
    the real `get_current_user` -> `get_db_session`), so the app never depends
    on a long-lived test session. This is a generator dependency: it holds the
    session open for the whole request (so lazy relationships like
    `user.projects` load) and commits/closes on teardown.
    """
    from common.dependencies import get_current_user
    from core.user.user_crud import crud_user
    from repos.db.sql_repo import SQLRepo

    def _get_test_user(request: Request) -> Generator[UserORM, None, None]:
        email = request.headers.get(TEST_USER_HEADER)
        if email is None:
            raise HTTPException(status_code=401, detail="No test user header")
        with SQLRepo().transaction() as db:
            yield crud_user.read_by_email(db=db, email=email)

    app.dependency_overrides[get_current_user] = _get_test_user


def create_user_client(
    app_client: TestClient, user: UserORM, **kwargs: Any
) -> TestClient:
    """Create a client that sends its requests as `user`.

    All user clients run on the event loop of `app_client`, the one client
    that ran the app's lifespan. The loop-bound singletons (websocket service,
    async Redis connection) only exist once per process, so a second lifespan
    on another event loop would break them, exactly as in production, where
    one process serves one app.
    """
    client = TestClient(
        app_client.app, headers={TEST_USER_HEADER: user.email}, **kwargs
    )
    client.portal = app_client.portal
    return client


# ==============================================================================
# GENERIC TEST DATA
# ==============================================================================
class ProjectWithSdoc(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM
    source_document_data: SourceDocumentDataORM


def create_test_user(db: Session) -> UserORM:
    """Create the primary test user."""
    from core.user.user_crud import crud_user
    from core.user.user_dto import UserCreate

    user = crud_user.create(
        db=db,
        create_dto=UserCreate(
            first_name="Test",
            last_name="User",
            email="testuser@dats.org",
            password="MyTestPassword123",
        ),
    )

    db.commit()
    db.refresh(user)

    return user


def create_test_project(db: Session, test_user: UserORM) -> ProjectORM:
    """Create a project for the test user."""
    from core.project.project_dto import ProjectCreate
    from core.project.project_service import ProjectService

    project_dto = ProjectCreate(
        title="Simple Test Project",
        description="A simple project for testing",
    )

    ps = ProjectService()
    project = ps.create_project(
        db=db,
        create_dto=project_dto,
        creating_user_id=test_user.id,
    )

    db.commit()
    db.refresh(project)

    return project


def create_project_with_sdoc(db: Session, test_project: ProjectORM) -> ProjectWithSdoc:
    """Create a source document (with data + file) in the test project."""
    from core.doc.source_document_crud import crud_sdoc
    from core.doc.source_document_data_crud import crud_sdoc_data
    from core.doc.source_document_data_dto import SourceDocumentDataCreate
    from core.doc.source_document_dto import SourceDocumentCreate
    from repos.filesystem_repo import FilesystemRepo

    sdoc = crud_sdoc.create(
        db=db,
        create_dto=SourceDocumentCreate(
            filename="test_document.txt",
            name="Test Document",
            doctype=DocType.text,
            project_id=test_project.id,
            folder_id=None,
        ),
    )

    file_path = FilesystemRepo()._get_dst_path_for_project_sdoc_file(
        proj_id=test_project.id, filename=sdoc.filename
    )
    relative_file_path = os.path.relpath(file_path, FilesystemRepo().root_dir)
    sdoc_data = crud_sdoc_data.create(
        db=db,
        create_dto=SourceDocumentDataCreate(
            id=sdoc.id,
            content="This is a test document. It has two sentences.",
            repo_url=str(relative_file_path),
            raw_html="<p>This is a test document. It has two sentences.</p>",
            html="<p><sent>This is a test document.</sent> <sent>It has two sentences.</sent></p>",
            token_starts=[0, 5, 8, 10, 15, 25, 28, 32, 36],
            token_ends=[4, 7, 9, 14, 23, 27, 31, 35, 45],
            sentence_starts=[0, 25],
            sentence_ends=[24, 46],
            token_time_starts=None,
            token_time_ends=None,
        ),
    )

    # Write a dummy file to the filesystem for the source document
    with open(file_path, "w") as f:
        f.write(sdoc_data.content)

    db.commit()
    db.refresh(test_project)
    db.refresh(sdoc)

    return {
        "project": test_project,
        "source_document": sdoc,
        "source_document_data": sdoc_data,
    }
