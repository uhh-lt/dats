import pytest
from fastapi.testclient import TestClient
from test.factories.project_factory import ProjectFactory
from test.factories.user_factory import UserFactory

from core.user.user_dto import (
    PublicUserRead,
    UserCreate,
    UserRead,
)


def model_validate_user_read(data: dict) -> UserRead:
    data["password"] = "hidden"  # because of exclude=True
    return UserRead.model_validate(data)


def test_get_me(client: TestClient, test_user: UserRead) -> None:
    resp = client.get("/user/me")
    assert resp.status_code == 200, resp.text

    me = model_validate_user_read(resp.json())
    assert me.id == test_user.id
    assert me.email == test_user.email
    assert me.first_name == test_user.first_name
    assert me.last_name == test_user.last_name


def test_get_user_by_id(client: TestClient, test_user: UserRead) -> None:
    resp = client.get(f"/user/by_id/{test_user.id}")
    assert resp.status_code == 200, resp.text

    user = PublicUserRead.model_validate(resp.json())
    assert user.id == test_user.id
    assert user.first_name == test_user.first_name
    assert user.last_name == test_user.last_name


def test_get_user_by_id_not_exists(client: TestClient) -> None:
    resp = client.get("/user/by_id/3000")
    assert resp.status_code == 404, resp.text


def test_get_users_by_project(
    client: TestClient,
    project_factory: ProjectFactory,
    test_user: UserRead,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    resp = client.get(f"/user/{project.id}/user")
    assert resp.status_code == 200, resp.json()


def test_get_users_by_project_not_exists(client: TestClient) -> None:
    resp = client.get("/user/2000/user")
    assert resp.status_code == 403


def test_get_all_users(client: TestClient, test_user: UserRead) -> None:
    resp = client.get("/user/all")
    assert resp.status_code == 200, resp.json()

    users = [PublicUserRead.model_validate(x) for x in resp.json()]
    ids = {u.id for u in users}
    assert test_user.id in ids


testdata = [
    pytest.param({"first_name": "NewFirst", "last_name": "NewLast"}, id="both_names"),
    pytest.param({"first_name": "OnlyFirst"}, id="only_first_name"),
    pytest.param({"last_name": "OnlyLast"}, id="only_last_name"),
    pytest.param({"email": "new@dats.org"}, id="only_email"),
    pytest.param({"password": "newpassword123"}, id="only_password"),
]


@pytest.mark.parametrize("payload", testdata)
def test_update_me(
    client: TestClient,
    test_user: UserRead,
    payload: dict,
) -> None:
    resp = client.patch("/user/", json=payload)
    assert resp.status_code == 200, resp.json()

    user = model_validate_user_read(resp.json())
    assert user.first_name == payload.get("first_name", test_user.first_name)
    assert user.last_name == payload.get("last_name", test_user.last_name)
    assert user.email == payload.get("email", test_user.email)
    assert user.id == test_user.id


def test_delete_me(
    client: TestClient,
    test_user: UserRead,
) -> None:
    resp = client.delete("/user/")
    assert resp.status_code == 200, resp.json()

    deleted_user = model_validate_user_read(resp.json())
    assert deleted_user.id == test_user.id


def test_delete_me_if_not_exsist(
    client: TestClient,
) -> None:
    # delete me! Should work the first time
    resp = client.delete("/user/")
    assert resp.status_code == 200, resp.json()

    # delete me again! Should fail now
    resp = client.delete("/user/")
    assert resp.status_code == 404, resp.content


def test_associate_user_to_project(
    client: TestClient,
    test_user: UserRead,
    project_factory: ProjectFactory,
    user_factory: UserFactory,
) -> None:
    from core.project.project_crud import crud_project

    # 1. Setup: create a project with the test_user and a new user
    project = project_factory.create(creating_user_id=test_user.id)
    new_user = user_factory.create(
        create_dto=UserCreate(
            email="other_unique_user@dats.org",
            first_name="John",
            last_name="Simpson",
            password="123xxx",
        )
    )

    # 2. Test: associate the new user to the project
    resp = client.patch(
        f"/user/{project.id}/user",
        json={"email": new_user.email},
    )
    assert resp.status_code == 200, resp.json()

    # 3. Validate: check response and DB state
    # 3.1 check response - ensure the returned user is the new user
    data = model_validate_user_read(resp.json())
    assert data.id == new_user.id
    assert data.email == new_user.email
    assert data.first_name == new_user.first_name
    assert data.last_name == new_user.last_name

    # 3.2 check DB state - ensure the user is associated with the project
    db_project = crud_project.read(db=project_factory.db_session, id=project.id)
    project_user_ids = [u.id for u in db_project.users]
    assert new_user.id in project_user_ids


def test_dissociate_user_from_project(
    client: TestClient,
    test_user: UserRead,
    project_factory: ProjectFactory,
) -> None:
    from core.project.project_crud import crud_project

    # 1. Setup: create a project with the test_user
    project = project_factory.create(creating_user_id=test_user.id)

    # 2. Test: dissociate the test_user from the project
    resp = client.delete(f"/user/{project.id}/user/{test_user.id}")
    assert resp.status_code == 200, resp.json()

    # 3. Validate: check response and DB state
    # 3.1 check response - ensure the returned user is the test_user
    data = model_validate_user_read(resp.json())
    assert data.id == test_user.id
    assert data.email == test_user.email
    assert data.first_name == test_user.first_name
    assert data.last_name == test_user.last_name

    # 3.2 check DB state - ensure the user is dissociated from the project
    db_project = crud_project.read(db=project_factory.db_session, id=project.id)
    project_user_ids = [u.id for u in db_project.users]
    assert test_user.id not in project_user_ids
