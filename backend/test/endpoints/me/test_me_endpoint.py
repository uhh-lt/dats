import pytest
from fastapi.testclient import TestClient

from core.project.project_dto import ProjectRead
from core.user.user_dto import UserRead
from dats_test_utils import create_user_client
from experiment_test_utils import RunUserProject
from modules.experiment.experiment_dto import ExperimentRead
from provenance_test_utils import ANNOTATION_KINDS, AnnotationKind, get_annotation

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
# GET MY PROJECTS (GET /users/me/projects) TESTS
# ===========================================================================


def test_get_user_projects_lists_the_projects_of_the_user(
    client: TestClient, test_project
):
    """The projects of the logged-in user include a project they just created."""
    created = client.put("/projects", json={"title": "Mine", "description": ""})
    assert created.status_code == 200, created.text

    response = client.get("/users/me/projects")

    assert response.status_code == 200, response.text
    project_ids = {ProjectRead.model_validate(p).id for p in response.json()}
    assert project_ids == {test_project.id, created.json()["id"]}


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
# DELETE ME (DELETE /users/me) TESTS: EXPERIMENTS
# ===========================================================================
# Deleting the gold annotator keeps its experiments without one (ON DELETE SET NULL).


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
