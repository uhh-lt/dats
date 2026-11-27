import pytest
from fastapi.testclient import TestClient

from core.project.project_crud import crud_project
from core.project.project_dto import ProjectUserLinks
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate, UserRead
from virtual_user_test_utils import VirtualUserProject

# ===========================================================================
# GET MEMBERS (GET /projects/{project_id}/members) TESTS
# ===========================================================================


def test_get_users_by_project(client: TestClient, project_with_user):
    project = project_with_user["project"]

    resp = client.get(f"/projects/{project.id}/members")

    assert resp.status_code == 200, resp.text
    assert len(resp.json()) == 3  # system, test, new


def test_get_users_by_project_not_exists(client: TestClient):
    non_existing_project_id = 2000
    resp = client.get(f"/projects/{non_existing_project_id}/members")

    assert resp.status_code == 403, resp.text


# ===========================================================================
# ADD MEMBER (PUT /projects/{project_id}/members) TESTS
# ===========================================================================


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
    resp = client.put(
        f"/projects/{test_project.id}/members",
        json={"email": new_user.email},
    )

    # 3. Validate: check response and DB state
    # 3.1 check response - the payload is the complete resulting member list
    assert resp.status_code == 200, resp.text
    data = ProjectUserLinks.model_validate(resp.json())
    assert data.project_id == test_project.id
    assert new_user.id in [u.id for u in data.users]

    # 3.2 check DB state - ensure the user is associated with the project
    db_project = crud_project.read(db=db_session, id=test_project.id)
    project_user_ids = [u.id for u in db_project.users]
    assert new_user.id in project_user_ids
    # the payload reflects the full member list
    assert len(data.users) == len(project_user_ids)


# ===========================================================================
# REMOVE MEMBER (DELETE /projects/{project_id}/members/{user_id}) TESTS
# ===========================================================================


def test_dissociate_user_from_project(
    client: TestClient, db_session, project_with_user
):
    # 1. Setup: create a project a new user
    project = project_with_user["project"]
    new_user = project_with_user["user"]

    # 2. Test: dissociate the new_user from the project
    resp = client.delete(f"/projects/{project.id}/members/{new_user.id}")

    # 3. Validate: check response and DB state
    assert resp.status_code == 200, resp.text
    # 3.1 check response - the payload is the complete resulting member list
    data = ProjectUserLinks.model_validate(resp.json())
    assert data.project_id == project.id
    assert new_user.id not in [u.id for u in data.users]

    # 3.2 check DB state - ensure the user is dissociated from the project
    db_project = crud_project.read(db=db_session, id=project.id)
    project_user_ids = [u.id for u in db_project.users]
    assert new_user.id not in project_user_ids
    # the payload reflects the full member list
    assert len(data.users) == len(project_user_ids)


@pytest.mark.parametrize(
    "user_key",
    [
        # a virtual user of the project belongs to it without being a member
        pytest.param("run1", id="own-virtual-user"),
        # a human who is no member of the project
        pytest.param("other_user", id="human-non-member"),
        # a virtual user of an outsider project
        pytest.param("other_run", id="outsider-virtual-user"),
    ],
)
def test_dissociate_a_non_member_is_not_found(
    client: TestClient, virtual_user_project: VirtualUserProject, user_key: str
):
    """Only a member of the project can be removed from it; any other user answers
    404 and the users of the project stay."""
    project = virtual_user_project["project"]
    user = virtual_user_project[user_key]  # type: ignore[literal-required]
    users_before = client.get(f"/projects/{project.id}/members").json()

    response = client.delete(f"/projects/{project.id}/members/{user.id}")

    assert response.status_code == 404, response.text
    assert client.get(f"/projects/{project.id}/members").json() == users_before


# ===========================================================================
# GET MEMBERS (GET /projects/{project_id}/members) TESTS: VIRTUAL USERS
# ===========================================================================


def test_get_users_by_project_lists_members_then_virtual_users(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """The users of a project are its members followed by its virtual users;
    virtual users of other projects are not listed."""
    project = virtual_user_project["project"]

    response = client.get(f"/projects/{project.id}/members")

    assert response.status_code == 200, response.text
    users = [UserRead.model_validate(data) for data in response.json()]
    assert [(u.is_virtual, u.first_name) for u in users][-2:] == [
        (True, "ExperimentA-Run1"),
        (True, "ExperimentA-Run2"),
    ]
    assert {u.id for u in users if not u.is_virtual} == {
        member.id for member in project.users
    }


# ===========================================================================
# ADD MEMBER (PUT /projects/{project_id}/members) TESTS: VIRTUAL USERS
# ===========================================================================


def test_associate_virtual_user_to_project_is_rejected(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """A virtual user belongs to its project without being a member, so it cannot
    be added as a member by its email."""
    project = virtual_user_project["project"]
    run1 = virtual_user_project["run1"]

    response = client.put(f"/projects/{project.id}/members", json={"email": run1.email})

    assert response.status_code == 400, response.text
    assert run1.id not in {member.id for member in project.users}
