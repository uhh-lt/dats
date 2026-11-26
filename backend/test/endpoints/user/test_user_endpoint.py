from typing import Any

import pytest
from fastapi.testclient import TestClient

from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectUserLinks
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate, UserRead
from dats_test_utils import create_user_client
from experiment_test_utils import RunUserProject
from modules.experiment.experiment_dto import ExperimentRead
from provenance_test_utils import ANNOTATION_KINDS, AnnotationKind, get_annotation
from virtual_user_test_utils import VirtualUserProject

# ===========================================================================
# GET ME (GET /users/me) TESTS
# ===========================================================================


def test_get_me(client: TestClient, test_user: UserRead):
    resp = client.get("/users/me")

    assert resp.status_code == 200, resp.text
    me = UserRead.model_validate(resp.json())
    assert me.id == test_user.id
    assert me.email == test_user.email
    assert me.first_name == test_user.first_name
    assert me.last_name == test_user.last_name


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
# UPDATE ME (PATCH /users/me) TESTS
# ===========================================================================


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
    resp = client.patch("/users/me", json=payload)

    assert resp.status_code == 200, resp.text
    user = UserRead.model_validate(resp.json())
    assert user.first_name == payload.get("first_name", test_user.first_name)
    assert user.last_name == payload.get("last_name", test_user.last_name)
    assert user.email == payload.get("email", test_user.email)
    assert user.id == test_user.id


# ===========================================================================
# DELETE ME (DELETE /users/me) TESTS
# ===========================================================================


def test_delete_me(
    client: TestClient,
    test_user: UserRead,
):
    resp = client.delete("/users/me")

    assert resp.status_code == 200, resp.text
    deleted_user = UserRead.model_validate(resp.json())
    assert deleted_user.id == test_user.id


def test_delete_me_if_not_exists(
    client: TestClient,
):
    # delete me! Should work the first time
    resp = client.delete("/users/me")
    assert resp.status_code == 200, resp.text

    # delete me again! Should fail now
    resp = client.delete("/users/me")
    assert resp.status_code == 404, resp.text


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
        # a virtual user of another project
        pytest.param("other_run", id="foreign-virtual-user"),
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
# CREATE VIRTUAL USER (PUT /projects/{project_id}/virtual-users) TESTS
# ===========================================================================


def test_create_virtual_user_returns_a_virtual_user_of_the_project(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """A virtual user is a user of the project with a generated email, whose
    name is its first name."""
    project = virtual_user_project["project"]

    response = client.put(
        f"/projects/{project.id}/virtual-users", json={"name": "ExperimentA-Run3"}
    )

    assert response.status_code == 200, response.text
    created = UserRead.model_validate(response.json())
    assert created.is_virtual
    assert created.project_id == project.id
    assert created.email.endswith("@virtual.dats")
    assert (created.first_name, created.last_name) == ("ExperimentA-Run3", "")
    users = client.get(f"/projects/{project.id}/members").json()
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

    response = client.put(
        f"/projects/{project.id}/virtual-users", json={"name": other_name}
    )

    assert response.status_code == 200, response.text
    assert UserRead.model_validate(response.json()).project_id == project.id


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

    response = client.put(f"/projects/{project.id}/virtual-users", json={"name": name})

    assert response.status_code == expected_status, response.text


def test_create_virtual_user_in_foreign_project_is_forbidden(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """Only members can create virtual users in a project."""
    other_project = virtual_user_project["other_project"]

    response = client.put(
        f"/projects/{other_project.id}/virtual-users", json={"name": "Intruder"}
    )

    assert response.status_code == 403, response.text


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
# UPDATE VIRTUAL USER (PATCH /projects/{project_id}/virtual-users/{user_id}) TESTS
# ===========================================================================


def test_update_virtual_user_renames_it(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """Renaming a virtual user changes its name (the first name)."""
    project = virtual_user_project["project"]
    run2 = virtual_user_project["run2"]

    response = client.patch(
        f"/projects/{project.id}/virtual-users/{run2.id}",
        json={"first_name": "Gold standard"},
    )

    assert response.status_code == 200, response.text
    renamed = UserRead.model_validate(response.json())
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
    project = virtual_user_project["project"]
    run2 = virtual_user_project["run2"]

    response = client.patch(
        f"/projects/{project.id}/virtual-users/{run2.id}", json=payload
    )

    assert response.status_code == expected_status, response.text


@pytest.mark.parametrize(
    "user_key",
    [
        # humans are no virtual users of any project
        pytest.param("user", id="human-self"),
        pytest.param("other_user", id="human-other"),
        # a virtual user of another project
        pytest.param("other_run", id="foreign-virtual-user"),
    ],
)
def test_update_virtual_user_rejects_other_users_and_foreign_virtual_users(
    client: TestClient,
    virtual_user_project: VirtualUserProject,
    user_key: str,
):
    """Only a virtual user of the project of the path can be updated: any other
    user answers 404."""
    project = virtual_user_project["project"]
    user = virtual_user_project[user_key]  # type: ignore[literal-required]

    response = client.patch(
        f"/projects/{project.id}/virtual-users/{user.id}", json={"first_name": "X"}
    )

    assert response.status_code == 404, response.text


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


# ===========================================================================
# DELETE VIRTUAL USER (DELETE /projects/{project_id}/virtual-users/{user_id}) TESTS
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

    response = client.delete(f"/projects/{project.id}/virtual-users/{run1.id}")

    assert response.status_code == 200, response.text
    assert UserRead.model_validate(response.json()).id == run1.id
    for span_id in span_ids:
        assert (
            client.get(f"/projects/{project.id}/span-annotations/{span_id}").status_code
            == 404
        )
    assert (
        run1.id
        not in client.get(
            f"/projects/{project.id}/source-documents/{sdoc.id}/annotators"
        ).json()
    )
    user_ids = [u["id"] for u in client.get(f"/projects/{project.id}/members").json()]
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
    project_id = virtual_user_project["project"].id

    response = client.delete(f"/projects/{project_id}/virtual-users/{run1.id}")

    assert response.status_code == 200, response.text
    span_response = client.get(f"/projects/{project_id}/span-annotations/{copy_id}")
    assert span_response.status_code == 200, span_response.text
    span = SpanAnnotationRead.model_validate(span_response.json())
    assert span.source_annotation_id is None
    assert span.source_user_id is None
    assert span.source_code_id == code_id


@pytest.mark.parametrize(
    "user_key",
    [
        # humans are no virtual users of any project
        pytest.param("user", id="human-self"),
        pytest.param("other_user", id="human-other"),
        # a virtual user of another project
        pytest.param("other_run", id="foreign-virtual-user"),
    ],
)
def test_delete_virtual_user_rejects_other_users_and_foreign_virtual_users(
    client: TestClient,
    db_session,
    virtual_user_project: VirtualUserProject,
    user_key: str,
):
    """Only a virtual user of the project of the path can be deleted: any other
    user answers 404 and stays."""
    project = virtual_user_project["project"]
    user = virtual_user_project[user_key]  # type: ignore[literal-required]

    response = client.delete(f"/projects/{project.id}/virtual-users/{user.id}")

    assert response.status_code == 404, response.text
    assert crud_user.exists(db=db_session, id=user.id)


# ===========================================================================
# DELETE ME (DELETE /users/me) TESTS: PROVENANCE
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

    response = assistant_client.delete("/users/me")

    assert response.status_code == 200, response.text
    copy = get_annotation(client, kind, project["project"].id, copy_id)
    assert copy.source_annotation_id is None
    assert copy.source_user_id is None
    assert copy.source_code_id == project["code_a"].id


# ===========================================================================
# DELETE VIRTUAL USER AND DELETE ME TESTS: EXPERIMENTS
# ===========================================================================
# A run user is deleted with its run only (ON DELETE NO ACTION); deleting the gold
# annotator keeps its experiments without one (ON DELETE SET NULL).


def _get_experiment(
    client: TestClient, project_id: int, experiment_id: int
) -> ExperimentRead:
    response = client.get(f"/projects/{project_id}/experiments/{experiment_id}")
    assert response.status_code == 200, response.text
    return ExperimentRead.model_validate(response.json())


def _project_user_ids(client: TestClient, project_id: int) -> set[int]:
    """The ids of the members and the virtual users of the project."""
    response = client.get(f"/projects/{project_id}/members")
    assert response.status_code == 200, response.text
    return {user["id"] for user in response.json()}


@pytest.mark.parametrize(
    "experiment_key,run_key,user_key",
    [
        # the run user of the finished run with stored scores
        pytest.param(
            "virtual_gold_experiment",
            "virtual_gold_run",
            "virtual_gold_run_user",
            id="finished-run",
        ),
        # the run user of the failed run without annotations
        pytest.param(
            "virtual_gold_experiment", "failed_run", "failed_run_user", id="failed-run"
        ),
        # the run user of the experiment of a human gold annotator
        pytest.param(
            "human_gold_experiment",
            "human_gold_run",
            "human_gold_run_user",
            id="human-gold-run",
        ),
    ],
)
def test_delete_virtual_user_of_an_experiment_run_is_a_conflict(
    client: TestClient,
    run_user_project: RunUserProject,
    experiment_key: str,
    run_key: str,
    user_key: str,
):
    """A run user cannot be deleted directly (HTTP 409, without internals): the
    user, its run and the run's stored scores stay."""
    experiment_id = run_user_project[experiment_key].id  # type: ignore[literal-required]
    run_id = run_user_project[run_key].id  # type: ignore[literal-required]
    user_id = run_user_project[user_key].id  # type: ignore[literal-required]
    runs_before = _get_experiment(
        client, run_user_project["project"].id, experiment_id
    ).runs

    response = client.delete(
        f"/projects/{run_user_project['project'].id}/virtual-users/{user_id}"
    )

    assert response.status_code == 409, response.text
    assert "still in use" in response.text
    assert "experimentrun" not in response.text
    assert user_id in _project_user_ids(client, run_user_project["project"].id)
    runs_after = _get_experiment(
        client, run_user_project["project"].id, experiment_id
    ).runs
    assert runs_after == runs_before
    assert run_id in {run.id for run in runs_after}


def test_delete_virtual_user_of_an_experiment_run_keeps_its_annotations(
    client: TestClient, run_user_project: RunUserProject
):
    """The refused deletion of a run user deletes none of its annotations."""
    user_id = run_user_project["virtual_gold_run_user"].id
    span_id = run_user_project["virtual_gold_anna"].id
    project_id = run_user_project["project"].id

    response = client.delete(f"/projects/{project_id}/virtual-users/{user_id}")

    assert response.status_code == 409, response.text
    assert (
        client.get(f"/projects/{project_id}/span-annotations/{span_id}").status_code
        == 200
    )


def test_delete_virtual_gold_annotator_keeps_experiment_runs_and_scores(
    client: TestClient, run_user_project: RunUserProject
):
    """Deleting the free virtual user "Group Standard", the gold annotator of
    VirtualGold, keeps the experiment without a gold annotator, with all its runs,
    their run users and their stored scores."""
    p = run_user_project
    experiment_id = p["virtual_gold_experiment"].id
    group_standard_id = p["group_standard"].id
    run_user_ids = [
        p[key].id  # type: ignore[literal-required]
        for key in ("virtual_gold_run_user", "second_run_user", "failed_run_user")
    ]
    before = _get_experiment(client, run_user_project["project"].id, experiment_id)
    assert before.gold_user_id == group_standard_id

    response = client.delete(
        f"/projects/{p['project'].id}/virtual-users/{group_standard_id}"
    )

    assert response.status_code == 200, response.text
    after = _get_experiment(client, run_user_project["project"].id, experiment_id)
    assert after.gold_user_id is None
    assert after.runs == before.runs
    baseline = next(run for run in after.runs if run.id == p["virtual_gold_run"].id)
    assert len(baseline.scores) > 0
    assert set(run_user_ids) <= _project_user_ids(client, p["project"].id)
    # the experiment of the human gold annotator is unaffected
    human_gold = _get_experiment(
        client, run_user_project["project"].id, p["human_gold_experiment"].id
    )
    assert human_gold.gold_user_id == p["gold_annotator"].id


def test_delete_me_as_gold_annotator_keeps_experiment_runs_and_scores(
    client: TestClient, app_client: TestClient, run_user_project: RunUserProject
):
    """The human gold annotator of HumanGold deleting their account keeps the
    experiment without a gold annotator, with its run, its run user and its stored
    scores."""
    p = run_user_project
    experiment_id = p["human_gold_experiment"].id
    run_user_id = p["human_gold_run_user"].id
    before = _get_experiment(client, run_user_project["project"].id, experiment_id)
    assert before.gold_user_id == p["gold_annotator"].id
    gold_client = create_user_client(app_client, p["gold_annotator"])

    response = gold_client.delete("/users/me")

    assert response.status_code == 200, response.text
    after = _get_experiment(client, run_user_project["project"].id, experiment_id)
    assert after.gold_user_id is None
    assert after.runs == before.runs
    assert len(after.runs[0].scores) > 0
    assert run_user_id in _project_user_ids(client, p["project"].id)
