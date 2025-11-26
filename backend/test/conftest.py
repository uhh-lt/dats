from typing import Any, Generator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from test.factories.bbox_annotation_factory import BBoxAnnotationFactory
from test.factories.code_factory import CodeFactory
from test.factories.project_factory import ProjectFactory
from test.factories.span_annotation_factory import SpanAnnotationFactory
from test.factories.tag_factory import TagFactory
from test.factories.user_factory import UserFactory

from core.user.user_dto import UserRead
from core.user.user_orm import UserORM


@pytest.fixture(scope="function", autouse=True)
def setup_env_variables(monkeypatch) -> None:
    import os

    shared_fs = os.getenv("SHARED_FILESYSTEM_ROOT_TEST", None)
    postgres = os.getenv("POSTGRES_DB", None)
    es_prefix = os.getenv("ES_INDEX_PREFIX", None)
    weaviate_postfix = os.getenv("WEAVIATE_COLLECTION_POSTFIX", None)

    assert shared_fs is not None, "Please set SHARED_FILESYSTEM_ROOT_TEST env variable"
    assert postgres is not None, "Please set POSTGRES_DB env variable"
    assert es_prefix is not None, "Please set ES_INDEX_PREFIX env variable"
    assert weaviate_postfix is not None, (
        "Please set WEAVIATE_COLLECTION_POSTFIX env variable"
    )

    monkeypatch.setenv("SHARED_FILESYSTEM_ROOT", shared_fs)
    monkeypatch.setenv("POSTGRES_DB", postgres + "test")
    monkeypatch.setenv("ES_INDEX_PREFIX", es_prefix + "test")
    monkeypatch.setenv("WEAVIATE_COLLECTION_POSTFIX", weaviate_postfix + "test")


# ---------------------------------------------------------------------------
# INIT REPOS
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function", autouse=True)
def setup_repos(setup_env_variables) -> None:
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
# FACTORIES
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function")
def project_factory(db_session: Session) -> ProjectFactory:
    return ProjectFactory(db_session=db_session)


@pytest.fixture(scope="function")
def user_factory(db_session: Session) -> UserFactory:
    return UserFactory(db_session=db_session)


@pytest.fixture(scope="function")
def code_factory(db_session: Session) -> CodeFactory:
    return CodeFactory(db_session=db_session)


@pytest.fixture(scope="function")
def tag_factory(db_session: Session) -> TagFactory:
    return TagFactory(db_session=db_session)


@pytest.fixture(scope="function")
def span_annotaion_factory(db_session: Session) -> SpanAnnotationFactory:
    return SpanAnnotationFactory(db_session=db_session)


@pytest.fixture(scope="function")
def bbox_annotation_factory(db_session: Session) -> BBoxAnnotationFactory:
    return BBoxAnnotationFactory(db_session=db_session)


# ---------------------------------------------------------------------------
# SYSTEM USERS
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function", autouse=True)
def setup_users(user_factory: UserFactory) -> None:
    from config import conf
    from core.user.user_crud import (
        ASSISTANT_FEWSHOT_ID,
        ASSISTANT_TRAINED_ID,
        ASSISTANT_ZEROSHOT_ID,
        SYSTEM_USER_ID,
    )
    from core.user.user_dto import UserCreate

    user_factory.create(
        create_dto=UserCreate(
            email=conf.system_user.email,
            first_name=conf.system_user.first_name,
            last_name=conf.system_user.last_name,
            password=conf.system_user.password,
        ),
        user_id=SYSTEM_USER_ID,
    )

    domain = conf.assistant_user.email.split("@")[1]

    assistants = [
        (ASSISTANT_ZEROSHOT_ID, "ZeroShot"),
        (ASSISTANT_FEWSHOT_ID, "FewShot"),
        (ASSISTANT_TRAINED_ID, "Trained"),
    ]

    for uid, lname in assistants:
        user_factory.create(
            create_dto=UserCreate(
                email=f"assistant-{lname.lower()}@{domain}",
                first_name=conf.assistant_user.first_name,
                last_name=lname,
                password=conf.assistant_user.password,
            ),
            user_id=uid,
        )


# ---------------------------------------------------------------------------
# TEST USER
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function")
def test_user(user_factory: UserFactory) -> UserRead:
    from core.user.user_dto import UserCreate

    user_db_obj = user_factory.create(
        create_dto=UserCreate(
            first_name="Test",
            last_name="User",
            email="testuser@dats.org",
            password="MyTestPassword123",
        ),
        user_id=3,
    )
    return UserRead.model_validate(user_db_obj)


# ---------------------------------------------------------------------------
# APP
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function")
def app(db_session: Session, test_user: UserORM) -> FastAPI:
    from fastapi import FastAPI

    from common.dependencies import get_current_user
    from core.user.user_crud import crud_user
    from utils.import_utils import import_by_suffix

    app = FastAPI()

    # TODO: maybe do this differently
    app.dependency_overrides[get_current_user] = lambda: crud_user.read_by_email(
        db=db_session, email=test_user.email
    )

    modules = import_by_suffix("_endpoint.py")
    modules.sort(key=lambda m: m.__name__)
    for m in modules:
        app.include_router(m.router)

    return app


# ---------------------------------------------------------------------------
# CLIENT
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function")
def client(app):
    with TestClient(app) as c:
        yield c
