from typing import Any

import pytest
from fastapi.testclient import TestClient

from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.user.user_dto import PublicUserRead, UserRead

from .conftest import VirtualUserProject


def _user_read(data: dict[str, Any]) -> UserRead:
    data["password"] = None  # excluded from serialization
    return UserRead.model_validate(data)


# ===========================================================================
# CREATE VIRTUAL USER (PUT /user/{project_id}/virtual_user) TESTS
# ===========================================================================


def test_create_virtual_user_returns_a_virtual_user_of_the_project(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """A virtual user is a user of the project without email and password,
    whose display name is its first name."""
    project = virtual_user_project["project"]

    response = client.put(
        f"/user/{project.id}/virtual_user", json={"name": "ExperimentA-Run3"}
    )

    assert response.status_code == 200, response.text
    created = _user_read(response.json())
    assert created.is_virtual
    assert created.project_id == project.id
    assert created.email is None
    assert (created.first_name, created.last_name) == ("ExperimentA-Run3", "")
    users = client.get(f"/user/{project.id}/user").json()
    assert [user["first_name"] for user in users if user["is_virtual"]] == [
        "ExperimentA-Run1",
        "ExperimentA-Run2",
        "ExperimentA-Run3",
    ]


def test_create_virtual_user_allows_a_name_of_another_project(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """Names are unique per project only: another project's name is free."""
    project = virtual_user_project["project"]
    other_name = virtual_user_project["other_run"].first_name

    response = client.put(f"/user/{project.id}/virtual_user", json={"name": other_name})

    assert response.status_code == 200, response.text
    assert _user_read(response.json()).project_id == project.id


@pytest.mark.parametrize(
    "name,expected_status",
    [
        # the project already has a virtual user of that name
        pytest.param("ExperimentA-Run1", 409, id="duplicate-name"),
        # a virtual user needs a name
        pytest.param("", 422, id="empty-name"),
    ],
)
def test_create_virtual_user_rejects_invalid_names(
    client: TestClient,
    virtual_user_project: VirtualUserProject,
    name: str,
    expected_status: int,
):
    """Duplicate and empty names are rejected."""
    project = virtual_user_project["project"]

    response = client.put(f"/user/{project.id}/virtual_user", json={"name": name})

    assert response.status_code == expected_status, response.text


def test_create_virtual_user_in_foreign_project_is_forbidden(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """Only members can create virtual users in a project."""
    other_project = virtual_user_project["other_project"]

    response = client.put(
        f"/user/{other_project.id}/virtual_user", json={"name": "Intruder"}
    )

    assert response.status_code == 403, response.text


# ===========================================================================
# READ USERS TESTS
# ===========================================================================


def test_get_users_by_project_lists_members_then_virtual_users(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """The users of a project are its members followed by its virtual users;
    virtual users of other projects are not listed."""
    project = virtual_user_project["project"]

    response = client.get(f"/user/{project.id}/user")

    assert response.status_code == 200, response.text
    users = [_user_read(data) for data in response.json()]
    assert [(u.is_virtual, u.first_name) for u in users][-2:] == [
        (True, "ExperimentA-Run1"),
        (True, "ExperimentA-Run2"),
    ]
    assert {u.id for u in users if not u.is_virtual} == {
        member.id for member in project.users
    }


def test_get_all_users_lists_no_virtual_users(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """The system-wide user list holds no virtual users."""
    response = client.get("/user/all")

    assert response.status_code == 200, response.text
    users = [PublicUserRead.model_validate(data) for data in response.json()]
    assert not any(user.is_virtual for user in users)
    assert virtual_user_project["other_user"].id in {user.id for user in users}


# ===========================================================================
# UPDATE VIRTUAL USER (PATCH /user/virtual_user/{user_id}) TESTS
# ===========================================================================


def test_update_virtual_user_renames_it(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """Renaming changes the display name (the first name)."""
    run2 = virtual_user_project["run2"]

    response = client.patch(
        f"/user/virtual_user/{run2.id}", json={"name": "Gold standard"}
    )

    assert response.status_code == 200, response.text
    renamed = _user_read(response.json())
    assert (renamed.id, renamed.first_name) == (run2.id, "Gold standard")


@pytest.mark.parametrize(
    "payload,expected_status",
    [
        # the project already has a virtual user of that name
        pytest.param({"name": "ExperimentA-Run1"}, 409, id="duplicate-name"),
        # an explicit null for a NOT NULL column
        pytest.param({"name": None}, 422, id="null-name"),
        # nothing to update
        pytest.param({}, 422, id="empty-update"),
    ],
)
def test_update_virtual_user_rejects_invalid_updates(
    client: TestClient,
    virtual_user_project: VirtualUserProject,
    payload: dict[str, Any],
    expected_status: int,
):
    """Invalid renames are rejected."""
    run2 = virtual_user_project["run2"]

    response = client.patch(f"/user/virtual_user/{run2.id}", json=payload)

    assert response.status_code == expected_status, response.text


@pytest.mark.parametrize(
    "user_key",
    [
        # human users have no project, so they are no virtual user of it
        pytest.param("user", id="human-self"),
        pytest.param("other_user", id="human-other"),
        # virtual users of projects the user is no member of
        pytest.param("other_run", id="foreign-virtual-user"),
    ],
)
def test_update_virtual_user_rejects_other_users_and_foreign_virtual_users(
    client: TestClient,
    virtual_user_project: VirtualUserProject,
    user_key: str,
):
    """Only virtual users of the user's projects can be renamed."""
    user = virtual_user_project[user_key]  # type: ignore[literal-required]

    response = client.patch(f"/user/virtual_user/{user.id}", json={"name": "X"})

    assert response.status_code == 403, response.text


# ===========================================================================
# DELETE VIRTUAL USER (DELETE /user/virtual_user/{user_id}) TESTS
# ===========================================================================


def test_delete_virtual_user_deletes_its_annotations(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """Deleting a virtual user deletes it with all its annotations."""
    run1 = virtual_user_project["run1"]
    sdoc = virtual_user_project["sdoc"]
    project = virtual_user_project["project"]
    span_ids = [
        virtual_user_project["run1_alpha"].id,
        virtual_user_project["run1_delta"].id,
    ]

    response = client.delete(f"/user/virtual_user/{run1.id}")

    assert response.status_code == 200, response.text
    assert _user_read(response.json()).id == run1.id
    for span_id in span_ids:
        # deleted objects are indistinguishable from unauthorized ones
        assert client.get(f"/span/{span_id}").status_code == 403
    assert run1.id not in client.get(f"/sdoc/{sdoc.id}/annotators").json()
    user_ids = [u["id"] for u in client.get(f"/user/{project.id}/user").json()]
    assert run1.id not in user_ids


def test_delete_virtual_user_keeps_provenance_of_copies(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """An annotation a human accepted from the deleted virtual user stays;
    its source annotation and source user become None ("a deleted user"), its
    source code stays."""
    run1 = virtual_user_project["run1"]
    copy_id = virtual_user_project["user_alpha_copy"].id
    code_id = virtual_user_project["code"].id

    response = client.delete(f"/user/virtual_user/{run1.id}")

    assert response.status_code == 200, response.text
    span_response = client.get(f"/span/{copy_id}")
    assert span_response.status_code == 200, span_response.text
    span = SpanAnnotationRead.model_validate(span_response.json())
    assert span.source_annotation_id is None
    assert span.source_user_id is None
    assert span.source_code_id == code_id


@pytest.mark.parametrize(
    "user_key",
    [
        # human users can never be deleted through this endpoint
        pytest.param("user", id="human-self"),
        pytest.param("other_user", id="human-other"),
        # virtual users of projects the user is no member of
        pytest.param("other_run", id="foreign-virtual-user"),
    ],
)
def test_delete_virtual_user_rejects_other_users_and_foreign_virtual_users(
    client: TestClient,
    virtual_user_project: VirtualUserProject,
    user_key: str,
):
    """Only virtual users of the user's projects can be deleted."""
    user = virtual_user_project[user_key]  # type: ignore[literal-required]

    response = client.delete(f"/user/virtual_user/{user.id}")

    assert response.status_code == 403, response.text
    assert client.get(f"/user/by_id/{user.id}").status_code == 200


# ===========================================================================
# LOGIN REJECTION TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "username,password",
    [
        # the display name is no login name
        pytest.param("ExperimentA-Run1", "", id="name-empty-password"),
        pytest.param("ExperimentA-Run1", "anything", id="name-any-password"),
    ],
)
def test_login_as_virtual_user_is_rejected(
    client: TestClient,
    virtual_user_project: VirtualUserProject,
    username: str,
    password: str,
):
    """Virtual users have no email and no password, so no login matches
    them."""
    response = client.post(
        "/authentication/login", data={"username": username, "password": password}
    )

    assert response.status_code in (403, 422), response.text
    assert "access_token" not in response.text
