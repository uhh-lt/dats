# ignore unorganized imports for this file
# ruff: noqa: E402

import os
import random
import string

# Allow app to detect if it's running inside tests
from typing import Generator

import pytest
from loguru import logger

from app.core.db.sql_service import SQLService
from app.core.startup import startup
from config import conf
from migration.migrate import run_required_migrations

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

    run_required_migrations()
    startup(reset_data=True)
    os.environ["STARTUP_DONE"] = "1"

from app.core.data.crud.code import crud_code
from app.core.data.crud.project import crud_project
from app.core.data.crud.user import SYSTEM_USER_ID, crud_user
from app.core.data.dto.code import CodeCreate, CodeRead
from app.core.data.dto.project import ProjectCreate
from app.core.data.dto.user import UserCreate, UserRead


# Always use the asyncio backend for async tests
@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def code(session: SQLService, project: int, user: int) -> Generator[int, None, None]:
    name = "".join(random.choices(string.ascii_letters, k=15))
    description = "".join(random.choices(string.ascii_letters, k=30))
    color = f"rgb({random.randint(0, 255)},{random.randint(0, 255)},{random.randint(0, 255)})"
    code = CodeCreate(
        name=name,
        color=color,
        description=description,
        project_id=project,
        user_id=user,
    )

    with session.db_session() as sess:
        db_code = crud_code.create(db=sess, create_dto=code)
        code_obj = CodeRead.model_validate(db_code)

    yield code_obj.id

    with session.db_session() as sess:
        crud_code.remove(db=sess, id=code_obj.id)


@pytest.fixture
def session() -> SQLService:
    return SQLService()


@pytest.fixture
def project(session: SQLService, user: int) -> Generator[int, None, None]:
    title = "".join(random.choices(string.ascii_letters, k=15))
    description = "Test description"

    with session.db_session() as sess:
        system_user = UserRead.model_validate(crud_user.read(sess, SYSTEM_USER_ID))
        id = crud_project.create(
            db=sess,
            create_dto=ProjectCreate(
                title=title,
                description=description,
            ),
            creating_user=system_user,
        ).id
        crud_project.associate_user(db=sess, proj_id=id, user_id=user)

    yield id

    with session.db_session() as sess:
        crud_project.remove(db=sess, id=id)


@pytest.fixture
def user(session: SQLService) -> Generator[int, None, None]:
    email = f'{"".join(random.choices(string.ascii_letters, k=15))}@gmail.com'
    first_name = "".join(random.choices(string.ascii_letters, k=15))
    last_name = "".join(random.choices(string.ascii_letters, k=15))
    password = "".join(random.choices(string.ascii_letters, k=15))

    user = UserCreate(
        email=email, first_name=first_name, last_name=last_name, password=password
    )

    with session.db_session() as sess:
        # create user
        db_user = crud_user.create(db=sess, create_dto=user)
        user = UserRead.model_validate(db_user)

    yield user.id

    with session.db_session() as sess:
        crud_user.remove(db=sess, id=user.id)
