# ignore unorganized imports for this file
# ruff: noqa: E402

import os
import random
import string
import sys
from time import sleep
from typing import Callable, Generator

import magic
import pytest
import requests
from fastapi import Request
from fastapi.datastructures import Headers
from fastapi.testclient import TestClient
from loguru import logger
from pytest import FixtureRequest
from sqlalchemy.orm import Session

from config import conf
from core.auth.authz_user import AuthzUser
from core.auth.validation import Validate
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.user.user_crud import SYSTEM_USER_ID, crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM
from main import app
from repos.db.sql_repo import SQLRepo
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem_repo import FilesystemRepo
from repos.vector.weaviate_repo import WeaviateRepo


def pytest_sessionfinish():
    # Make sure the next test session starts with clean databases
    SQLRepo().drop_database()
    ElasticSearchRepo().drop_indices()
    WeaviateRepo().drop_indices()
    FilesystemRepo().purge_filesystem()
    return True


# Use this once to clear all databases
@pytest.fixture
def reset_data():
    # Flo: just do it once. We have to check because if we start the main function, unvicorn will import this
    # file once more manually, so it would be executed twice.
    STARTUP_DONE = bool(int(os.environ.get("STARTUP_DONE", "0")))
    if not STARTUP_DONE:
        if SQLRepo().database_contains_data():
            # Make sure we don't accidentally delete important data
            logger.error(
                f"Database '{conf.postgres.db}' is not empty. The tests will only run given a database without any tables in it. Drop database? Type 'yes' to clear all data"
            )
            if sys.stdin.isatty() and sys.stdin.readline().strip() == "yes":
                pytest_sessionfinish()
            elif (
                not sys.stdin.isatty()
                and os.environ.get("RESET_DATABASE_FOR_TESTING", "0") == "1"
            ):
                pytest_sessionfinish()
            else:
                exit(1)


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
            is_system=False,
        )
        db_code = crud_code.create(db=db, create_dto=code)
        return db_code

    return factory


@pytest.fixture
def sql_repo() -> SQLRepo:
    return SQLRepo()


@pytest.fixture
def db(sql_repo: SQLRepo) -> Generator[Session, None, None]:
    db = sql_repo.session_maker()

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

        system_user = crud_user.read(db, SYSTEM_USER_ID)
        project = crud_project.create(
            db=db,
            create_dto=ProjectCreate(
                title=title,
                description=description,
            ),
            creating_user=system_user,
        )
        crud_project.associate_user(db=db, proj_id=project.id, user_id=user.id)
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
        email = f"{''.join(random.choices(string.ascii_letters, k=15))}@gmail.com"
        first_name = "".join(random.choices(string.ascii_letters, k=15))
        last_name = "".join(random.choices(string.ascii_letters, k=15))
        password = "".join(random.choices(string.ascii_letters, k=15))

        user = UserCreate(
            email=email, first_name=first_name, last_name=last_name, password=password
        )

        # create user
        db_user = crud_user.create(db=db, create_dto=user)
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
            self.user_list = {}

        def create(self, first_name):
            # Create
            email = f"{first_name}@dats.com"
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
            scope = ""
            client_id = ""
            client_secret = ""
            login = {
                "grant_type": "password",  # as per the OAuth2.0 spec, this is the only supported grant type
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
                "Authorization": f"{login['token_type']} {login['access_token']}"
            }

            self.user_list[first_name] = credentials
            return credentials

    return UserFactory()


@pytest.fixture(scope="module")
def api_project(
    client: TestClient,
):
    class ProjectFactory:
        def __init__(self):
            self.project_list = {}

        def create(self, user, title):
            headers = user["AuthHeader"]
            project = {
                "title": title,
                "description": "".join(random.choices(string.ascii_letters, k=100)),
                "creator": user,
            }
            response = client.put("/project", headers=headers, json=project).json()
            project["id"] = response["id"]
            self.project_list[title] = project
            return project

    return ProjectFactory()


@pytest.fixture(scope="module")
def api_code(client: TestClient):
    class CodeFactory:
        def __init__(self):
            self.code_list = {}

        def create(self, name: str, user: dict, project: dict):
            headers = user["AuthHeader"]
            project_id = project["id"]
            code = {
                "name": name,
                "color": "string",
                "description": "string",
                "parent_id": None,
                "project_id": project_id,
                "is_system": False,
            }
            response = client.put("/code", headers=headers, json=code).json()
            code["id"] = response["id"]
            self.code_list[name] = code
            return code

    return CodeFactory()


@pytest.fixture(scope="module")
def api_document(client: TestClient):
    class DocumentFactory:
        def __init__(self):
            self.document_list = {}

        def read_docstatus(self, user: dict, project: dict, status: int):
            headers = user["AuthHeader"]
            response = client.get(
                f"/docprocessing/project/{project['id']}/status/{status}/simple",
                headers=headers,
            )
            assert response.status_code == 200, (
                f"Failed to get project status. Response: {response}"
            )
            json_response = response.json()
            print(f"Document status (simple): {json_response}")
            return json_response

        def upload_files(self, upload_list: list, user: dict, project: dict):
            import json

            # 1. get number of successfully uploaded docs in project
            num_successful_docs = len(
                self.read_docstatus(user=user, project=project, status=1)
            )
            print(
                f"Number of successfully uploaded docs (before upload): {num_successful_docs}"
            )

            # 2. upload files
            user_headers = user["AuthHeader"]
            files = []
            settings = {
                "extract_images": True,
                "pages_per_chunk": 10,
                "keyword_number": 5,
                "keyword_deduplication_threshold": 0.5,
                "keyword_max_ngram_size": 2,
            }
            download_headers = {
                "User-Agent": "MauiBot/420.0 (https://github.com/uhh-lt/dwts/; maui@bot.org)"
            }
            for filename in upload_list:
                request_download = requests.get(filename[0], headers=download_headers)
                mime = magic.from_buffer(request_download.content, mime=True)
                files.append(
                    ("uploaded_files", (filename[1], request_download.content, mime))
                )
            data = {"settings": json.dumps(settings)}
            response = client.put(
                f"/docprocessing/project/{project['id']}",
                headers=user_headers,
                files=files,
                data=data,
            )
            print(f"Uploaded {len(upload_list)} files!")
            assert response.status_code == 200, (
                f"Failed to upload files. Response: {response}. Files: {files}"
            )

            # 3. wait for success
            sleep(5)
            num_processing_docs = len(
                self.read_docstatus(user=user, project=project, status=0)
            )
            while num_processing_docs > 0:
                sleep(5)
                num_processing_docs = len(
                    self.read_docstatus(user=user, project=project, status=0)
                )

            # 4. get number of successfully uploaded docs in project again
            successful_docs = self.read_docstatus(user=user, project=project, status=1)
            error_docs = self.read_docstatus(user=user, project=project, status=-100)
            print(
                f"Number of successfully uploaded docs (after upload): {len(successful_docs)}"
            )
            print(f"Number of error docs (after upload): {len(error_docs)}")

            is_finished = (num_successful_docs + len(upload_list)) == len(
                successful_docs
            )
            assert is_finished, (
                f"An error occurred during file upload: Expected {num_successful_docs + len(upload_list)}, but got {len(successful_docs)}"
            )

            docs = {}
            for file in successful_docs:
                document = {
                    "sdoc_id": file["id"],
                    "project_id": file["project_id"],
                    "filename": file["filename"],
                    "doctype": file["doctype"],
                }
                docs[document["filename"]] = document
            self.document_list.update(docs)
            return docs

    return DocumentFactory()
