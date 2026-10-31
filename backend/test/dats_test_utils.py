"""Startup of DATS for the tests, and the helpers the test suites share.

The tests boot DATS with the same functions as production (see `bootstrap.py`).
This module composes them into one function per conftest fixture, so the
conftests only declare the fixture scopes, and adds what is specific to testing:
the isolation guard, the authenticated test clients and the factories for the
generic test data.
"""

import json
import os
import subprocess
import sys
import time
from collections.abc import Mapping
from pathlib import Path
from typing import TYPE_CHECKING, Any, Generator, TypedDict

from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

import bootstrap
from common.doc_type_enum import DocType
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM

if TYPE_CHECKING:
    from core.annotation.span_annotation_orm import SpanAnnotationORM

# The tests authenticate with this header instead of a JWT (see `_install_test_auth`)
_TEST_USER_HEADER = "x-dats-test-user"


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
    src_dir = str(Path(__file__).resolve().parents[1] / "src")
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
# STARTUP
# ==============================================================================
def start_dats() -> None:
    """Start DATS in the test process like a server process: connect all repos,
    init the services, and create the test database from scratch with the
    migrations."""
    from repos.db.sql_repo import SQLRepo
    from repos.redis_repo import RedisRepo

    bootstrap.connect_repos()
    bootstrap.init_services()
    SQLRepo().drop_database()
    bootstrap.migrate_database()
    # Workers killed by an earlier test session leave their running job in Redis,
    # which `_drain_workers` would wait for
    RedisRepo().remove_data()


def clean_data_stores() -> None:
    """Empty all data stores and create the system data again, so a test starts
    from a fresh DATS instance."""
    _drain_workers()
    bootstrap.delete_all_data()
    bootstrap.ensure_system_data()


def _drain_workers(timeout: float = 300.0) -> None:
    """Discard the queued jobs and wait until the workers ended their running jobs.

    The background worker (see `conftest.start_workers`) keeps running the jobs
    of a test after the test ended. Cleaning the data stores under a running job
    deadlocks its transaction with the TRUNCATE, or lets the job write into the
    next test's data. A job that ends may enqueue the next pipeline step, so this
    repeats until no job is queued, scheduled or running.

    The running jobs are read from the workers' `rq:worker:<name>` hashes, not
    from the started job registries or `Worker.all()`: a canceled job leaves the
    registries but keeps running in a `SimpleWorker`, and the Redis flush of the
    cleanup removes the worker registrations. RQ sets `current_job` in the hash
    whenever a worker starts a job and removes it when the job ended.
    """
    from rq.worker import Worker

    from systems.job_system.job_service import JobService

    js = JobService()
    redis_conn = js.redis_conn
    assert redis_conn is not None, "JobService is not initialized"

    deadline = time.monotonic() + timeout
    # A worker dequeues a job shortly before it sets `current_job`, so the
    # workers only count as idle when they are idle in two checks in a row
    idle_checks = 0
    while True:
        for queue in js.queues.values():
            queue.empty()
            scheduled = queue.scheduled_job_registry
            for job_id in scheduled.get_job_ids():
                scheduled.remove(job_id, delete_job=True)

        running_job_ids = [
            job_id
            for key in redis_conn.scan_iter(
                match=f"{Worker.redis_worker_namespace_prefix}*"
            )
            if redis_conn.type(key) == b"hash"
            and (job_id := redis_conn.hget(key, "current_job")) is not None
        ]
        if len(running_job_ids) == 0:
            idle_checks += 1
            if idle_checks == 2:
                return
        else:
            idle_checks = 0
            if time.monotonic() > deadline:
                raise RuntimeError(
                    f"The workers did not end the jobs {running_job_ids} "
                    f"within {timeout}s"
                )
        time.sleep(0.05)


def create_test_app() -> FastAPI:
    """Create the real DATS app (see `main.py`), authenticating the requests by
    a test header instead of a JWT."""
    app = bootstrap.create_app()
    _install_test_auth(app)
    return app


# ==============================================================================
# CLIENTS
# ==============================================================================
def _install_test_auth(app: FastAPI) -> None:
    """Authenticate the requests by the email in the `_TEST_USER_HEADER` header
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
        email = request.headers.get(_TEST_USER_HEADER)
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
        app_client.app, headers={_TEST_USER_HEADER: user.email}, **kwargs
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
    from core.project.project_crud import crud_project
    from core.project.project_dto import ProjectCreate
    from core.project.project_service import ProjectService

    project_dto = ProjectCreate(
        title="Simple Test Project",
        description="A simple project for testing",
    )

    ps = ProjectService()
    project_read = ps.create_project(
        db=db,
        create_dto=project_dto,
        creating_user_id=test_user.id,
    )

    db.commit()
    project = crud_project.read(db=db, id=project_read.id)
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
        project_id=test_project.id, filename=sdoc.filename
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


def _offsets(parts: list[str]) -> tuple[str, list[int], list[int]]:
    """Join text parts with spaces and return their exact character offsets."""
    content = " ".join(parts)
    starts: list[int] = []
    ends: list[int] = []
    cursor = 0
    for part in parts:
        start = content.index(part, cursor)
        starts.append(start)
        ends.append(start + len(part))
        cursor = start + len(part)
    return content, starts, ends


def _token_offsets(content: str) -> tuple[list[int], list[int]]:
    """Return whitespace-token character offsets for deterministic test text."""
    starts: list[int] = []
    ends: list[int] = []
    cursor = 0
    while cursor < len(content):
        while cursor < len(content) and content[cursor].isspace():
            cursor += 1
        if cursor >= len(content):
            break
        start = cursor
        while cursor < len(content) and not content[cursor].isspace():
            cursor += 1
        starts.append(start)
        ends.append(cursor)
    return starts, ends


def create_text_document(
    db: Session,
    *,
    project: ProjectORM,
    filename: str,
    name: str,
    sentences: list[str],
    initialize_metadata: bool = True,
) -> SourceDocumentORM:
    """Create a fully tokenized text document with one sentence per entry."""
    from core.doc.source_document_crud import crud_sdoc
    from core.doc.source_document_data_crud import crud_sdoc_data
    from core.doc.source_document_data_dto import SourceDocumentDataCreate
    from core.doc.source_document_dto import SourceDocumentCreate
    from core.metadata.source_document_metadata_crud import crud_sdoc_meta

    content, sentence_starts, sentence_ends = _offsets(sentences)
    token_starts, token_ends = _token_offsets(content)
    sdoc = crud_sdoc.create(
        db=db,
        create_dto=SourceDocumentCreate(
            filename=filename,
            name=name,
            doctype=DocType.text,
            project_id=project.id,
        ),
    )
    crud_sdoc_data.create(
        db=db,
        create_dto=SourceDocumentDataCreate(
            id=sdoc.id,
            content=content,
            repo_url=f"tests/{filename}",
            raw_html=f"<p>{content}</p>",
            html="<p>"
            + " ".join(f"<sent>{sentence}</sent>" for sentence in sentences)
            + "</p>",
            token_starts=token_starts,
            token_ends=token_ends,
            sentence_starts=sentence_starts,
            sentence_ends=sentence_ends,
            token_time_starts=None,
            token_time_ends=None,
        ),
    )
    if initialize_metadata:
        crud_sdoc_meta.create_initial_metadata(
            db=db,
            project_id=project.id,
            sdoc_id=sdoc.id,
            doctype=DocType.text,
        )
        language = crud_sdoc_meta.read_by_sdoc_and_key(
            db=db, sdoc_id=sdoc.id, key="language"
        )
        language.str_value = "en"
    return sdoc


def create_span_for_text(
    db: Session,
    *,
    sdoc: SourceDocumentORM,
    text: str,
    code_id: int,
    user_id: int,
) -> "SpanAnnotationORM":
    """Create a span annotation by locating an exact string in a document."""
    from core.annotation.span_annotation_crud import crud_span_anno
    from core.annotation.span_annotation_dto import SpanAnnotationCreate
    from core.annotation.span_annotation_service import SpanAnnotationService
    from core.doc.source_document_data_crud import crud_sdoc_data

    data = crud_sdoc_data.read(db=db, id=sdoc.id)
    begin = data.content.index(text)
    end = begin + len(text)
    begin_token = next(
        index for index, token_end in enumerate(data.token_ends) if token_end > begin
    )
    end_token = (
        next(
            index for index, token_end in enumerate(data.token_ends) if token_end >= end
        )
        + 1
    )
    return crud_span_anno.read(
        db=db,
        id=SpanAnnotationService()
        .create(
            db=db,
            user_id=user_id,
            create_dto=SpanAnnotationCreate(
                sdoc_id=sdoc.id,
                begin=begin,
                end=end,
                begin_token=begin_token,
                end_token=end_token,
                span_text=text,
                code_id=code_id,
            ),
        )
        .id,
    )
