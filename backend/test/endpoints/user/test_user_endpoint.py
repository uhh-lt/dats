import pytest
from fastapi.testclient import TestClient

from core.project.project_crud import crud_project
from core.user.user_crud import crud_user
from core.user.user_dto import (
    PublicUserRead,
    UserCreate,
    UserRead,
)


def _model_validate_user_read(data: dict) -> UserRead:
    data["password"] = "hidden"  # because of exclude=True
    return UserRead.model_validate(data)


def test_get_me(client: TestClient, test_user: UserRead):
    resp = client.get("/user/me")

    assert resp.status_code == 200, resp.text
    me = _model_validate_user_read(resp.json())
    assert me.id == test_user.id
    assert me.email == test_user.email
    assert me.first_name == test_user.first_name
    assert me.last_name == test_user.last_name


def test_get_user_by_id(client: TestClient, project_with_user):
    new_user = project_with_user["user"]

    resp = client.get(f"/user/by_id/{new_user.id}")

    assert resp.status_code == 200, resp.text
    user = PublicUserRead.model_validate(resp.json())
    assert user.id == new_user.id
    assert user.first_name == new_user.first_name
    assert user.last_name == new_user.last_name


def test_get_user_by_id_not_exists(client: TestClient):
    non_existing_user_id = 3000
    resp = client.get(f"/user/by_id/{non_existing_user_id}")

    assert resp.status_code == 404, resp.text


def test_get_users_by_project(client: TestClient, project_with_user):
    project = project_with_user["project"]

    resp = client.get(f"/user/{project.id}/user")

    assert resp.status_code == 200, resp.json()
    assert len(resp.json()) == 7  # system, demo, 3xassistant, test, new


def test_get_users_by_project_not_exists(client: TestClient):
    non_existing_project_id = 2000
    resp = client.get(f"/user/{non_existing_project_id}/user")

    assert resp.status_code == 403


def test_get_all_users(client: TestClient, project_with_user, test_user: UserRead):
    new_user = project_with_user["user"]

    resp = client.get("/user/all")

    assert resp.status_code == 200, resp.json()
    user_ids = [PublicUserRead.model_validate(x).id for x in resp.json()]
    assert test_user.id in user_ids
    assert new_user.id in user_ids


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
):
    resp = client.patch("/user/", json=payload)

    assert resp.status_code == 200, resp.json()
    user = _model_validate_user_read(resp.json())
    assert user.first_name == payload.get("first_name", test_user.first_name)
    assert user.last_name == payload.get("last_name", test_user.last_name)
    assert user.email == payload.get("email", test_user.email)
    assert user.id == test_user.id


def test_delete_me(
    client: TestClient,
    test_user: UserRead,
):
    resp = client.delete("/user/")

    assert resp.status_code == 200, resp.json()
    deleted_user = _model_validate_user_read(resp.json())
    assert deleted_user.id == test_user.id


def test_delete_me_if_not_exists(
    client: TestClient,
):
    # delete me! Should work the first time
    resp = client.delete("/user/")
    assert resp.status_code == 200, resp.json()

    # delete me again! Should fail now
    resp = client.delete("/user/")
    assert resp.status_code == 404, resp.content


def test_associate_user_to_project(
    client: TestClient, db_session, test_user, test_project
):
    # 1. Setup: create an additional user
    new_user = crud_user.create(
        db=db_session,
        create_dto=UserCreate(
            email="tim.fischer@dats.science",
            first_name="Tim",
            last_name="Fischer",
            password="timfischer123",
        ),
    )

    # 2. Test: associate the new user to the project
    resp = client.patch(
        f"/user/{test_project.id}/user",
        json={"email": new_user.email},
    )

    # 3. Validate: check response and DB state
    # 3.1 check response - ensure the returned user is the new user
    assert resp.status_code == 200, resp.json()
    data = _model_validate_user_read(resp.json())
    assert data.id == new_user.id
    assert data.email == new_user.email
    assert data.first_name == new_user.first_name
    assert data.last_name == new_user.last_name

    # 3.2 check DB state - ensure the user is associated with the project
    db_project = crud_project.read(db=db_session, id=test_project.id)
    project_user_ids = [u.id for u in db_project.users]
    assert new_user.id in project_user_ids


def test_dissociate_user_from_project(
    client: TestClient, db_session, project_with_user
):
    # 1. Setup: create a project a new user
    project = project_with_user["project"]
    new_user = project_with_user["user"]

    # 2. Test: dissociate the new_user from the project
    resp = client.delete(f"/user/{project.id}/user/{new_user.id}")

    # 3. Validate: check response and DB state
    assert resp.status_code == 200, resp.json()
    # 3.1 check response - ensure the returned user is the new_user
    data = _model_validate_user_read(resp.json())
    assert data.id == new_user.id
    assert data.email == new_user.email
    assert data.first_name == new_user.first_name
    assert data.last_name == new_user.last_name

    # 3.2 check DB state - ensure the user is dissociated from the project
    db_project = crud_project.read(db=db_session, id=project.id)
    project_user_ids = [u.id for u in db_project.users]
    assert new_user.id not in project_user_ids
