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

from fastapi.testclient import TestClient

from app.core.data.crud.code import crud_code
from app.core.data.crud.project import crud_project
from app.core.data.crud.user import SYSTEM_USER_ID, crud_user
from app.core.data.dto.code import CodeCreate, CodeRead
from app.core.data.dto.project import ProjectCreate
from app.core.data.dto.user import UserCreate, UserRead
from main import app


def pytest_sessionfinish():
    # Make sure the next test session starts with a clean database
    SQLService().drop_database()


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


@pytest.fixture(scope="session")
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


# API Fixtures
@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="module")
def credentials(client: TestClient) -> Generator[dict, None, None]:
    class UserFactory:
        def __init__(self):
            self.userList = {}

        def create(self, first_name):
            # Create
            email = "".join(random.choices(string.ascii_letters, k=10)) + "@aol.com"
            password = "".join(random.choices(string.ascii_letters, k=20))
            first_name = first_name
            last_name = "".join(random.choices(string.ascii_letters, k=10))
            credentials = {
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "password": password,
            }
            response = client.post("/authentication/register", json=credentials).json()
            credentials["id"] = response["id"]

            # Login
            grant_type = ""
            scope = ""
            client_id = ""
            client_secret = ""
            login = {
                "grant_type": grant_type,
                "username": credentials["email"],
                "password": credentials["password"],
                "scope": scope,
                "client_id": client_id,
                "client_secret": client_secret,
            }
            login = client.post("authentication/login", data=login).json()
            credentials["token_type"] = login["token_type"]
            credentials["access_token"] = login["access_token"]
            credentials["AuthHeader"] = {
                "Authorization": f"{login["token_type"]} {login["access_token"]}"
            }

            self.userList[first_name] = credentials
            return credentials

        def __del__(self):
            for user in self.userList.values():
                print(
                    f"{client.delete(f"/user/{user["id"]}", headers = user["AuthHeader"])=}"
                )

    return UserFactory()


@pytest.fixture(scope="module")
def api_project(
    client: TestClient,
):
    class ProjectFactory:
        def __init__(self):
            self.projectList = {}

        def create(self, user, title):
            headers = user["AuthHeader"]
            project = {
                "title": title,
                "description": "".join(random.choices(string.ascii_letters, k=100)),
                "creator": user,
            }
            response = client.put("/project", headers=headers, json=project).json()
            project["id"] = response["id"]
            self.projectList["title"] = project
            print(f"{self.projectList=}")
            return project

        def __del__(self):
            # TODO: Prevent user deletion before project deletion or use SYSTEM user
            # FIXME: Using the standard SYSTEM@dwts.org user
            # login with system user to remove all projects
            superuser = {"username": "SYSTEM@dwts.org", "password": "SYSTEM"}
            login = client.post("authentication/login", data=superuser).json()
            superuser_authheader = {
                "Authorization": f"{login["token_type"]} {login["access_token"]}"
            }
            for project in self.projectList.values():
                client.delete(
                    f"/project/{project["id"]}", headers=superuser_authheader
                ).json()

    return ProjectFactory()


@pytest.fixture(scope="module")
def api_codes(client: TestClient, api_project, credentials):
    class CodesFactory:
        def __init__(self):
            self.codeList = {}

        def create(self, name, user, project):
            headers = user["AuthHeader"]
            project_id = project["id"]
            user_id = user["id"]
            code = {
                "name": name,
                "color": "string",
                "description": "string",
                "parent_code_id": None,
                "project_id": project_id,
                "user_id": user_id,
            }
            response = client.put("/code", headers=headers, json=code).json()
            print(f"{response=}")
            self.codeList["name"] = name
            print(f"{self.codeList=}")
            return code

        def __del__(self):
            # TODO: Prevent user deletion before project deletion or use SYSTEM user
            # FIXME: Using the standard SYSTEM@dwts.org user
            # login with system user to remove all projects
            superuser = {"username": "SYSTEM@dwts.org", "password": "SYSTEM"}
            login = client.post("authentication/login", data=superuser).json()
            superuser_authheader = {
                "Authorization": f"{login["token_type"]} {login["access_token"]}"
            }
            for project in self.projectList.values():
                client.delete(
                    f"/project/{project["id"]}", headers=superuser_authheader
                ).json()

    return CodesFactory()
