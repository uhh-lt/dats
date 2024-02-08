# ignore unorganized imports for this file
# ruff: noqa: E402

import os
import random
import string
from typing import Callable, Generator

import pytest
from fastapi import Request
from fastapi.datastructures import Headers
from loguru import logger
from pytest import FixtureRequest
from sqlalchemy.orm import Session

from api.validation import Validate
from app.core.authorization.authz_user import AuthzUser
from app.core.data.orm.code import CodeORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.user import UserORM
from app.core.db.sql_service import SQLService
from app.core.startup import startup
from config import conf

os.environ["RAY_ENABLED"] = "False"

# Flo: just do it once. We have to check because if we start the main function, unvicorn will import this
# file once more manually, so it would be executed twice.
STARTUP_DONE = bool(int(os.environ.get("STARTUP_DONE", "0")))
if not STARTUP_DONE:
    if SQLService().database_contains_data():
        # Make sure we don't accidentally delete important data
        logger.error(
            f"Database '{conf.postgres.db}' is not empty. The tests will only run given a database without any tables in it."
        )
        exit(1)

    startup(reset_data=True)
    os.environ["STARTUP_DONE"] = "1"

from app.core.data.crud.code import crud_code
from app.core.data.crud.project import crud_project
from app.core.data.crud.user import SYSTEM_USER_ID, crud_user
from app.core.data.dto.code import CodeCreate
from app.core.data.dto.project import ProjectCreate
from app.core.data.dto.user import UserCreate, UserRead


def pytest_sessionfinish():
    # Make sure the next test session starts with a clean database
    SQLService().drop_database()


# Always use the asyncio backend for async tests
@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def code(make_code) -> CodeORM:
    return make_code()


@pytest.fixture
def make_code(
    db: Session, project: ProjectORM, user: UserORM, request: FixtureRequest
) -> Callable[[], CodeORM]:
    def factory():
        name = "".join(random.choices(string.ascii_letters, k=15))
        description = "".join(random.choices(string.ascii_letters, k=30))
        color = f"rgb({random.randint(0, 255)},{random.randint(0, 255)},{random.randint(0, 255)})"
        code = CodeCreate(
            name=name,
            color=color,
            description=description,
            project_id=project.id,
            user_id=user.id,
        )

        db_code = crud_code.create(db=db, create_dto=code)
        code_id = db_code.id

        request.addfinalizer(lambda: crud_code.remove(db=db, id=code_id))

        return db_code

    return factory


@pytest.fixture
def sql_service() -> SQLService:
    return SQLService()


@pytest.fixture
def db(sql_service: SQLService) -> Generator[Session, None, None]:
    db = sql_service.session_maker()

    yield db

    db.rollback()
    db.close()


@pytest.fixture
def project(make_project) -> ProjectORM:
    return make_project()


@pytest.fixture
def make_project(
    db: Session, user: UserORM, request: FixtureRequest
) -> Callable[[], ProjectORM]:
    def factory():
        title = "".join(random.choices(string.ascii_letters, k=15))
        description = "Test description"

        system_user = UserRead.model_validate(crud_user.read(db, SYSTEM_USER_ID))
        project = crud_project.create(
            db=db,
            create_dto=ProjectCreate(
                title=title,
                description=description,
            ),
            creating_user=system_user,
        )
        crud_project.associate_user(db=db, proj_id=project.id, user_id=user.id)

        project_id = project.id

        request.addfinalizer(lambda: crud_project.remove(db, id=project_id))

        return project

    return factory


@pytest.fixture
def user(make_user: Callable[[], UserORM]) -> UserORM:
    return make_user()


# This fixture allows a single test to easily create
# multiple users.
@pytest.fixture
def make_user(db: Session, request: FixtureRequest) -> Callable[[], UserORM]:
    def factory():
        email = f'{"".join(random.choices(string.ascii_letters, k=15))}@gmail.com'
        first_name = "".join(random.choices(string.ascii_letters, k=15))
        last_name = "".join(random.choices(string.ascii_letters, k=15))
        password = "".join(random.choices(string.ascii_letters, k=15))

        user = UserCreate(
            email=email, first_name=first_name, last_name=last_name, password=password
        )

        # create user
        db_user = crud_user.create(db=db, create_dto=user)
        user_id = db_user.id

        request.addfinalizer(lambda: crud_user.remove(db=db, id=user_id))

        return db_user

    return factory


@pytest.fixture
def authz_user(user: UserORM, db: Session, mock_request: Request) -> AuthzUser:
    authz_user = AuthzUser(request=mock_request, user=user, db=db)

    return authz_user


@pytest.fixture
def validate(db: Session) -> Validate:
    validate = Validate(db=db)

    return validate


@pytest.fixture
def mock_request() -> Request:
    request = Request(
        {
            "type": "http",
            "path": "/",
            "headers": Headers({}).raw,
            "http_version": "1.1",
            "method": "GET",
            "scheme": "https",
            "client": ("127.0.0.1", 8080),
            "server": ("localhost", 443),
        }
    )
    return request
