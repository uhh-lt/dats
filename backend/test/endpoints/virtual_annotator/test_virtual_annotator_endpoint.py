from typing import Any

import pytest
from fastapi.testclient import TestClient

from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.user.user_dto import PublicUserRead, UserRead
from core.user.user_enum import UserKind

from .conftest import VirtualAnnotatorProject


def _user_read(data: dict[str, Any]) -> UserRead:
    data["password"] = None  # excluded from serialization
    return UserRead.model_validate(data)


# ===========================================================================
# CREATE VIRTUAL ANNOTATOR (PUT /user/{project_id}/virtual_annotator) TESTS
# ===========================================================================


def test_create_virtual_annotator_returns_a_virtual_user_of_the_project(
    client: TestClient, virtual_annotator_project: VirtualAnnotatorProject
):
    """A virtual annotator is a user of the project without email and password,
    whose display name is its first name."""
    project = virtual_annotator_project["project"]

    response = client.put(
        f"/user/{project.id}/virtual_annotator", json={"name": "ExperimentA-Run3"}
    )

    assert response.status_code == 200, response.text
    created = _user_read(response.json())
    assert created.kind == UserKind.VIRTUAL
    assert created.project_id == project.id
    assert created.email is None
    assert (created.first_name, created.last_name) == ("ExperimentA-Run3", "")
    annotators = client.get(f"/user/{project.id}/virtual_annotator").json()
    assert [annotator["first_name"] for annotator in annotators] == [
        "ExperimentA-Run1",
        "ExperimentA-Run2",
        "ExperimentA-Run3",
    ]


def test_create_virtual_annotator_allows_a_name_of_another_project(
    client: TestClient, virtual_annotator_project: VirtualAnnotatorProject
):
    """Names are unique per project only: another project's name is free."""
    project = virtual_annotator_project["project"]
    other_name = virtual_annotator_project["other_run"].first_name

    response = client.put(
        f"/user/{project.id}/virtual_annotator", json={"name": other_name}
    )

    assert response.status_code == 200, response.text
    assert _user_read(response.json()).project_id == project.id


@pytest.mark.parametrize(
    "name,expected_status",
    [
        # the project already has a virtual annotator of that name
        pytest.param("ExperimentA-Run1", 409, id="duplicate-name"),
        # a virtual annotator needs a name
        pytest.param("", 422, id="empty-name"),
    ],
)
def test_create_virtual_annotator_rejects_invalid_names(
    client: TestClient,
    virtual_annotator_project: VirtualAnnotatorProject,
    name: str,
    expected_status: int,
):
    """Duplicate and empty names are rejected."""
    project = virtual_annotator_project["project"]

    response = client.put(f"/user/{project.id}/virtual_annotator", json={"name": name})

    assert response.status_code == expected_status, response.text


def test_create_virtual_annotator_in_foreign_project_is_forbidden(
    client: TestClient, virtual_annotator_project: VirtualAnnotatorProject
):
    """Only members can create virtual annotators in a project."""
    other_project = virtual_annotator_project["other_project"]

    response = client.put(
        f"/user/{other_project.id}/virtual_annotator", json={"name": "Intruder"}
    )

    assert response.status_code == 403, response.text


# ===========================================================================
# READ USERS / ANNOTATORS TESTS
# ===========================================================================


def test_get_annotators_by_project_lists_members_then_virtual_annotators(
    client: TestClient, virtual_annotator_project: VirtualAnnotatorProject
):
    """The annotators of a project are its members followed by its virtual
    annotators; virtual annotators of other projects are not listed."""
    project = virtual_annotator_project["project"]

    response = client.get(f"/user/{project.id}/annotator")

    assert response.status_code == 200, response.text
    annotators = [_user_read(data) for data in response.json()]
    assert [(a.kind, a.first_name) for a in annotators][-2:] == [
        (UserKind.VIRTUAL, "ExperimentA-Run1"),
        (UserKind.VIRTUAL, "ExperimentA-Run2"),
    ]
    assert {a.id for a in annotators if a.kind == UserKind.HUMAN} == {
        member.id for member in project.users
    }


def test_get_users_by_project_lists_no_virtual_annotators(
    client: TestClient, virtual_annotator_project: VirtualAnnotatorProject
):
    """Virtual annotators are no project members."""
    project = virtual_annotator_project["project"]

    response = client.get(f"/user/{project.id}/user")

    assert response.status_code == 200, response.text
    assert {_user_read(data).kind for data in response.json()} == {UserKind.HUMAN}


def test_get_all_users_lists_no_virtual_annotators(
    client: TestClient, virtual_annotator_project: VirtualAnnotatorProject
):
    """The system-wide user list holds human users only."""
    response = client.get("/user/all")

    assert response.status_code == 200, response.text
    users = [PublicUserRead.model_validate(data) for data in response.json()]
    assert {user.kind for user in users} == {UserKind.HUMAN}
    assert virtual_annotator_project["other_user"].id in {user.id for user in users}


# ===========================================================================
# UPDATE VIRTUAL ANNOTATOR (PATCH /user/virtual_annotator/{user_id}) TESTS
# ===========================================================================


def test_update_virtual_annotator_renames_it(
    client: TestClient, virtual_annotator_project: VirtualAnnotatorProject
):
    """Renaming changes the display name (the first name)."""
    run2 = virtual_annotator_project["run2"]

    response = client.patch(
        f"/user/virtual_annotator/{run2.id}", json={"name": "Gold standard"}
    )

    assert response.status_code == 200, response.text
    renamed = _user_read(response.json())
    assert (renamed.id, renamed.first_name) == (run2.id, "Gold standard")


@pytest.mark.parametrize(
    "payload,expected_status",
    [
        # the project already has a virtual annotator of that name
        pytest.param({"name": "ExperimentA-Run1"}, 409, id="duplicate-name"),
        # an explicit null for a NOT NULL column
        pytest.param({"name": None}, 422, id="null-name"),
        # nothing to update
        pytest.param({}, 422, id="empty-update"),
    ],
)
def test_update_virtual_annotator_rejects_invalid_updates(
    client: TestClient,
    virtual_annotator_project: VirtualAnnotatorProject,
    payload: dict[str, Any],
    expected_status: int,
):
    """Invalid renames are rejected."""
    run2 = virtual_annotator_project["run2"]

    response = client.patch(f"/user/virtual_annotator/{run2.id}", json=payload)

    assert response.status_code == expected_status, response.text


@pytest.mark.parametrize(
    "user_key",
    [
        # human users have no project, so they are no virtual annotator of it
        pytest.param("user", id="human-self"),
        pytest.param("other_user", id="human-other"),
        # virtual annotators of projects the user is no member of
        pytest.param("other_run", id="foreign-virtual-annotator"),
    ],
)
def test_update_virtual_annotator_rejects_humans_and_foreign_annotators(
    client: TestClient,
    virtual_annotator_project: VirtualAnnotatorProject,
    user_key: str,
):
    """Only virtual annotators of the user's projects can be renamed."""
    user = virtual_annotator_project[user_key]  # type: ignore[literal-required]

    response = client.patch(f"/user/virtual_annotator/{user.id}", json={"name": "X"})

    assert response.status_code == 403, response.text


# ===========================================================================
# DELETE VIRTUAL ANNOTATOR (DELETE /user/virtual_annotator/{user_id}) TESTS
# ===========================================================================


def test_delete_virtual_annotator_deletes_its_annotations(
    client: TestClient, virtual_annotator_project: VirtualAnnotatorProject
):
    """Deleting a virtual annotator deletes it with all its annotations."""
    run1 = virtual_annotator_project["run1"]
    sdoc = virtual_annotator_project["sdoc"]
    project = virtual_annotator_project["project"]
    span_ids = [
        virtual_annotator_project["run1_alpha"].id,
        virtual_annotator_project["run1_delta"].id,
    ]

    response = client.delete(f"/user/virtual_annotator/{run1.id}")

    assert response.status_code == 200, response.text
    assert _user_read(response.json()).id == run1.id
    for span_id in span_ids:
        # deleted objects are indistinguishable from unauthorized ones
        assert client.get(f"/span/{span_id}").status_code == 403
    assert run1.id not in client.get(f"/sdoc/{sdoc.id}/annotators").json()
    annotator_ids = [
        a["id"] for a in client.get(f"/user/{project.id}/annotator").json()
    ]
    assert run1.id not in annotator_ids


def test_delete_virtual_annotator_keeps_provenance_of_copies(
    client: TestClient, virtual_annotator_project: VirtualAnnotatorProject
):
    """An annotation a human accepted from the deleted virtual annotator stays;
    its source annotation and source user become None ("a deleted user"), its
    source code stays."""
    run1 = virtual_annotator_project["run1"]
    copy_id = virtual_annotator_project["user_alpha_copy"].id
    code_id = virtual_annotator_project["code"].id

    response = client.delete(f"/user/virtual_annotator/{run1.id}")

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
        # virtual annotators of projects the user is no member of
        pytest.param("other_run", id="foreign-virtual-annotator"),
    ],
)
def test_delete_virtual_annotator_rejects_humans_and_foreign_annotators(
    client: TestClient,
    virtual_annotator_project: VirtualAnnotatorProject,
    user_key: str,
):
    """Only virtual annotators of the user's projects can be deleted."""
    user = virtual_annotator_project[user_key]  # type: ignore[literal-required]

    response = client.delete(f"/user/virtual_annotator/{user.id}")

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
def test_login_as_virtual_annotator_is_rejected(
    client: TestClient,
    virtual_annotator_project: VirtualAnnotatorProject,
    username: str,
    password: str,
):
    """Virtual annotators have no email and no password, so no login matches
    them."""
    response = client.post(
        "/authentication/login", data={"username": username, "password": password}
    )

    assert response.status_code in (403, 422), response.text
    assert "access_token" not in response.text


@pytest.mark.parametrize(
    "key_name,expected_status",
    [
        # a human user's key authenticates
        pytest.param("user_api_key", 200, id="human-key"),
        # a virtual annotator's key is rejected, even if it exists
        pytest.param("run1_api_key", 403, id="virtual-annotator-key"),
    ],
)
def test_content_auth_rejects_virtual_annotator_api_key(
    client: TestClient,
    virtual_annotator_project: VirtualAnnotatorProject,
    key_name: str,
    expected_status: int,
):
    """`/authentication/content` authenticates by the cookie with the real token
    resolution (the test clients' header auth only replaces the bearer
    dependency), which rejects every token of a virtual annotator."""
    api_key: str = virtual_annotator_project[key_name]  # type: ignore[literal-required]
    client.cookies.set("Authorization", api_key)

    response = client.get("/authentication/content")

    assert response.status_code == expected_status, response.text
