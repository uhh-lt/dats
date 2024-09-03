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

from fastapi.testclient import TestClient

from app.core.data.crud.code import crud_code
from app.core.data.crud.project import crud_project
from app.core.data.crud.user import SYSTEM_USER_ID, crud_user
from app.core.data.dto.code import CodeCreate
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


# API Fixtures
@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="module")
def api_user(client: TestClient):
    class UserFactory:
        def __init__(self):
            self.userList = {}

        def create(self, first_name):
            # Create
            email = "".join(random.choices(string.ascii_letters, k=10)) + "@aol.com"
            password = "".join(random.choices(string.ascii_letters, k=20))
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
                client.delete(f"/user/{user["id"]}", headers=user["AuthHeader"])

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
            self.projectList[title] = project
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
                client.delete(f"/project/{project["id"]}", headers=superuser_authheader)

    return ProjectFactory()


@pytest.fixture(scope="module")
def api_code(client: TestClient):
    class CodeFactory:
        def __init__(self):
            self.codeList = {}

        def create(self, name: string, user: dict, project: dict):
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
            # print(f"{response=}")
            code["id"] = response["id"]
            self.codeList[name] = code
            # print(f"{self.codeList=}")
            return code

    return CodeFactory()


@pytest.fixture(scope="module")
def api_document(client: TestClient):
    class DocumentFactory:
        def __init__(self):
            self.codeList = {}

        def create(self, filename: string, user: dict, project: dict):
            headers = user["AuthHeader"]
            project_id = project["id"]
            user_id = user["id"]
            document = {
                "filename": filename,
                "project_id": project_id,
                "user_id": user_id,
            }
            response = client.put(
                f"/project/{project["id"]}/sdoc", headers=headers, json=document
            ).json()
            print(f"{response=}")
            document["id"] = response["id"]
            self.documentList[filename] = document
            # print(f"{self.codeList=}")
            return document

    return DocumentFactory()
