"""Reusable DATS test-setup helpers.

Each function encapsulates one piece of the DATS test-environment setup so that
both the global `test/conftest.py` (function-scoped) and any suite-local conftest
(e.g. the read-only search suite, which is session-scoped) can build the exact
same environment without duplicating the setup logic. The conftests only differ
in the *scope* of the fixtures that wrap these functions.
"""

import os
from typing import TypedDict

from fastapi import FastAPI
from sqlalchemy.orm import Session

from common.doc_type import DocType
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM


class ProjectWithSdoc(TypedDict):
    project: ProjectORM
    source_document: SourceDocumentORM
    source_document_data: SourceDocumentDataORM


def setup_repos() -> None:
    """Wipe and re-create all external repos (filesystem, DB, ES, Weaviate, Redis)."""
    from sqlalchemy import text

    from repos.db.orm_base import ORMBase
    from repos.db.sql_repo import SQLRepo
    from repos.elastic.elastic_repo import ElasticSearchRepo
    from repos.filesystem_repo import FilesystemRepo
    from repos.redis_repo import RedisRepo
    from repos.vector.weaviate_repo import WeaviateRepo
    from systems.job_system.job_service import JobService

    fsr = FilesystemRepo()
    fsr._create_root_directory_structure(remove_if_exists=True)

    sqlr = SQLRepo()
    sqlr.connect()
    # drop all tables
    sqlr.remove_data()
    # create all tables
    with sqlr.transaction() as db:
        db.execute(
            text(
                "CREATE COLLATION IF NOT EXISTS natsort "
                "(provider = icu, locale = 'und-u-kn-true');"
            )
        )
    assert sqlr._engine is not None
    ORMBase.metadata.create_all(sqlr._engine)

    es = ElasticSearchRepo()
    es.connect()
    es.remove_data()

    weaviate = WeaviateRepo()
    weaviate.connect()
    weaviate.remove_data()

    redis = RedisRepo()
    redis.connect()
    redis.remove_data()

    JobService().initialize()


def create_weaviate_collections() -> None:
    """Create all Weaviate collections."""
    from core.doc.document_collection import DocumentCollection
    from core.doc.image_collection import ImageCollection
    from core.doc.sentence_collection import SentenceCollection
    from modules.perspectives.aspect_collection import AspectCollection
    from modules.perspectives.cluster_collection import ClusterCollection
    from repos.vector.weaviate_repo import WeaviateRepo

    client = WeaviateRepo().get_client()
    DocumentCollection.create_collection(client)
    SentenceCollection.create_collection(client)
    ImageCollection.create_collection(client)
    AspectCollection.create_collection(client)
    ClusterCollection.create_collection(client)


def create_system_users(db: Session) -> None:
    """Create the system, demo, and assistant users."""
    from config import conf
    from core.user.user_crud import (
        ASSISTANT_FEWSHOT_ID,
        ASSISTANT_TRAINED_ID,
        ASSISTANT_ZEROSHOT_ID,
        crud_user,
    )
    from core.user.user_dto import UserCreate

    crud_user.create(
        db=db,
        create_dto=UserCreate(
            email=conf.system_user.email,
            first_name=conf.system_user.first_name,
            last_name=conf.system_user.last_name,
            password=conf.system_user.password.get_secret_value(),
        ),
    )

    crud_user.create(
        db=db,
        create_dto=UserCreate(
            email=conf.demo_user.email,
            first_name=conf.demo_user.first_name,
            last_name=conf.demo_user.last_name,
            password=conf.demo_user.password.get_secret_value(),
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
            db=db,
            create_dto=UserCreate(
                email=f"assistant-{lname.lower()}@{domain}",
                first_name=conf.assistant_user.first_name,
                last_name=lname,
                password=conf.assistant_user.password.get_secret_value(),
            ),
            id=uid,
        )

    db.commit()


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


def build_app(db: Session, test_user: UserORM) -> FastAPI:
    """Build the FastAPI test application (replicates main.py)."""
    from psycopg2.errors import UniqueViolation
    from sqlalchemy.exc import IntegrityError

    from common.dependencies import get_current_user
    from common.exception_handler import exception_handler, exception_handlers
    from core.user.user_crud import crud_user
    from utils.import_utils import import_by_suffix

    app = FastAPI()

    # TODO: maybe do this differently
    app.dependency_overrides[get_current_user] = lambda: crud_user.read_by_email(
        db=db, email=test_user.email
    )

    # Import jobs first because they register generated routes on endpoint routers.
    import_by_suffix("_job.py")

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
