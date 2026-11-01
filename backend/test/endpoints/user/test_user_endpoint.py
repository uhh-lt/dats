from typing import Any

import pytest
from fastapi.testclient import TestClient

from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectUserLinks
from core.user.user_crud import crud_user
from core.user.user_dto import (
    PublicUserRead,
    UserCreate,
    UserRead,
)
from dats_test_utils import create_user_client
from provenance_test_utils import ANNOTATION_KINDS, AnnotationKind, get_annotation
from virtual_user_test_utils import VirtualUserProject


def _model_validate_user_read(data: dict) -> UserRead:
    data["password"] = "hidden"  # because of exclude=True
    return UserRead.model_validate(data)


def _model_validate_project_user_links(data: dict) -> ProjectUserLinks:
    for user in data["users"]:
        user["password"] = "hidden"  # because of exclude=True
    return ProjectUserLinks.model_validate(data)


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

    assert resp.status_code == 200, resp.text
    assert len(resp.json()) == 3  # system, test, new


def test_get_users_by_project_not_exists(client: TestClient):
    non_existing_project_id = 2000
    resp = client.get(f"/user/{non_existing_project_id}/user")

    assert resp.status_code == 403, resp.text


def test_get_all_users(client: TestClient, project_with_user, test_user: UserRead):
    new_user = project_with_user["user"]

    resp = client.get("/user/all")

    assert resp.status_code == 200, resp.text
    user_ids = [PublicUserRead.model_validate(x).id for x in resp.json()]
    assert len(user_ids) == 4  # system, demo, test, new
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

    assert resp.status_code == 200, resp.text
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

    assert resp.status_code == 200, resp.text
    deleted_user = _model_validate_user_read(resp.json())
    assert deleted_user.id == test_user.id


def test_delete_me_if_not_exists(
    client: TestClient,
):
    # delete me! Should work the first time
    resp = client.delete("/user/")
    assert resp.status_code == 200, resp.text

    # delete me again! Should fail now
    resp = client.delete("/user/")
    assert resp.status_code == 404, resp.text


def test_associate_user_to_project(client: TestClient, db_session, test_project):
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
    db_session.commit()
    db_session.refresh(new_user)

    # 2. Test: associate the new user to the project
    resp = client.patch(
        f"/user/{test_project.id}/user",
        json={"email": new_user.email},
    )

    # 3. Validate: check response and DB state
    # 3.1 check response - the payload is the complete resulting member list
    assert resp.status_code == 200, resp.text
    data = _model_validate_project_user_links(resp.json())
    assert data.project_id == test_project.id
    assert new_user.id in [u.id for u in data.users]

    # 3.2 check DB state - ensure the user is associated with the project
    db_project = crud_project.read(db=db_session, id=test_project.id)
    project_user_ids = [u.id for u in db_project.users]
    assert new_user.id in project_user_ids
    # the payload reflects the full member list
    assert len(data.users) == len(project_user_ids)


def test_dissociate_user_from_project(
    client: TestClient, db_session, project_with_user
):
    # 1. Setup: create a project a new user
    project = project_with_user["project"]
    new_user = project_with_user["user"]

    # 2. Test: dissociate the new_user from the project
    resp = client.delete(f"/user/{project.id}/user/{new_user.id}")

    # 3. Validate: check response and DB state
    assert resp.status_code == 200, resp.text
    # 3.1 check response - the payload is the complete resulting member list
    data = _model_validate_project_user_links(resp.json())
    assert data.project_id == project.id
    assert new_user.id not in [u.id for u in data.users]

    # 3.2 check DB state - ensure the user is dissociated from the project
    db_project = crud_project.read(db=db_session, id=project.id)
    project_user_ids = [u.id for u in db_project.users]
    assert new_user.id not in project_user_ids
    # the payload reflects the full member list
    assert len(data.users) == len(project_user_ids)


# ===========================================================================
# CREATE VIRTUAL USER (PUT /user/{project_id}/virtual_user) TESTS: VIRTUAL USERS
# ===========================================================================


def test_create_virtual_user_returns_a_virtual_user_of_the_project(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """A virtual user is a user of the project with a generated email, whose
    name is its first name."""
    project = virtual_user_project["project"]

    response = client.put(
        f"/user/{project.id}/virtual_user", json={"name": "ExperimentA-Run3"}
    )

    assert response.status_code == 200, response.text
    created = _model_validate_user_read(response.json())
    assert created.is_virtual
    assert created.project_id == project.id
    assert created.email.endswith("@virtual.dats")
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
    assert _model_validate_user_read(response.json()).project_id == project.id


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
# GET USERS (/user/{project_id}/user, /user/all) TESTS: VIRTUAL USERS
# ===========================================================================


def test_get_users_by_project_lists_members_then_virtual_users(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """The users of a project are its members followed by its virtual users;
    virtual users of other projects are not listed."""
    project = virtual_user_project["project"]

    response = client.get(f"/user/{project.id}/user")

    assert response.status_code == 200, response.text
    users = [_model_validate_user_read(data) for data in response.json()]
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
# UPDATE USER (PATCH /user/{user_id}) TESTS: VIRTUAL USERS
# ===========================================================================


def test_update_virtual_user_renames_it(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """Renaming a virtual user changes its name (the first name)."""
    run2 = virtual_user_project["run2"]

    response = client.patch(f"/user/{run2.id}", json={"first_name": "Gold standard"})

    assert response.status_code == 200, response.text
    renamed = _model_validate_user_read(response.json())
    assert (renamed.id, renamed.first_name) == (run2.id, "Gold standard")


@pytest.mark.parametrize(
    "payload,expected_status",
    [
        # the project already has a virtual user of that name
        pytest.param({"first_name": "ExperimentA-Run1"}, 409, id="duplicate-name"),
        # an explicit null for a NOT NULL column
        pytest.param({"first_name": None}, 422, id="null-name"),
        # nothing to update
        pytest.param({}, 422, id="empty-update"),
        # the email and password of a virtual user are generated, never chosen
        pytest.param({"email": "claimed@dats.org"}, 400, id="email"),
        pytest.param({"password": "MyPassword123"}, 400, id="password"),
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

    response = client.patch(f"/user/{run2.id}", json=payload)

    assert response.status_code == expected_status, response.text


@pytest.mark.parametrize(
    "user_key",
    [
        # other users have no project, so they are in no project of the user
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
    """Only virtual users of the user's projects can be updated by id."""
    user = virtual_user_project[user_key]  # type: ignore[literal-required]

    response = client.patch(f"/user/{user.id}", json={"first_name": "X"})

    assert response.status_code == 403, response.text


# ===========================================================================
# ASSOCIATE USER (PATCH /user/{project_id}/user) TESTS: VIRTUAL USERS
# ===========================================================================


def test_associate_virtual_user_to_project_is_rejected(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """A virtual user belongs to its project without being a member, so it cannot
    be added as a member by its email."""
    project = virtual_user_project["project"]
    run1 = virtual_user_project["run1"]

    response = client.patch(f"/user/{project.id}/user", json={"email": run1.email})

    assert response.status_code == 400, response.text
    assert run1.id not in {member.id for member in project.users}


# ===========================================================================
# DELETE USER (DELETE /user/{user_id}) TESTS: VIRTUAL USERS
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

    response = client.delete(f"/user/{run1.id}")

    assert response.status_code == 200, response.text
    assert _model_validate_user_read(response.json()).id == run1.id
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

    response = client.delete(f"/user/{run1.id}")

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
        # other users have no project, so they are in no project of the user
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

    response = client.delete(f"/user/{user.id}")

    assert response.status_code == 403, response.text
    assert client.get(f"/user/by_id/{user.id}").status_code == 200


# ===========================================================================
# DELETE USER (/user) TESTS: PROVENANCE
# ===========================================================================
# The provenance columns are ON DELETE SET NULL: deleting the source annotation, its
# user or its code clears only that column of the copy and keeps the rest.


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_delete_source_user_keeps_source_code_of_copy(
    client: TestClient,
    app_client: TestClient,
    provenance_project_with_copies,
    kind: AnnotationKind,
) -> None:
    """The assistant deleting their account deletes their annotations and clears the
    copy's `source_annotation_id` and `source_user_id`; the source code stays."""
    project = provenance_project_with_copies
    copy_id = project[f"{kind}_copies"]["copy_id"]
    assistant_client = create_user_client(app_client, project["assistant"])

    response = assistant_client.delete("/user/")

    assert response.status_code == 200, response.text
    copy = get_annotation(client, kind, copy_id)
    assert copy.source_annotation_id is None
    assert copy.source_user_id is None
    assert copy.source_code_id == project["code_a"].id
