from fastapi.testclient import TestClient

from common.feature_enum import Feature
from core.project.project_dto import (
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
)
from experiment_test_utils import RunUserProject

# ===========================================================================
# CREATE PROJECT (/project) TESTS
# ===========================================================================


def test_create_new_project(client):
    payload = {
        "title": "My First Test Project",
        "description": "Testing create endpoint",
    }
    response = client.put("/project", json=payload)

    assert response.status_code == 200, response.text
    project = response.json()
    assert project["title"] == payload["title"]
    assert project["description"] == payload["description"]


# ===========================================================================
# DELETE PROJECT (/project/{project_id}) TESTS
# ===========================================================================


def test_delete_existing_project(client: TestClient, test_project):
    response = client.delete(f"/project/{test_project.id}")

    assert response.status_code == 200, response.text
    project = response.json()
    assert project["id"] == test_project.id
    assert project["title"] == test_project.title
    assert project["description"] == test_project.description


def test_delete_project_with_experiments_deletes_them_and_their_run_users(
    client: TestClient, run_user_project: RunUserProject
):
    """Deleting a project removes its experiments, runs and users in one statement:
    the run users (ON DELETE NO ACTION) do not block it."""
    p = run_user_project
    project_id = p["project"].id
    experiment_ids = [
        p["human_gold_experiment"].id,
        p["virtual_gold_experiment"].id,
    ]
    virtual_user_ids = [
        p[key].id  # type: ignore[literal-required]
        for key in (
            "group_standard",
            "human_gold_run_user",
            "virtual_gold_run_user",
            "second_run_user",
            "failed_run_user",
        )
    ]

    response = client.delete(f"/project/{project_id}")

    assert response.status_code == 200, response.text
    assert response.json()["id"] == project_id
    for experiment_id in experiment_ids:
        # deleted objects are indistinguishable from unauthorized ones
        assert client.get(f"/experiment/{experiment_id}").status_code == 403
    for user_id in virtual_user_ids:
        assert client.get(f"/user/by_id/{user_id}").status_code == 404
    # the human gold annotator is no virtual user: only the membership is gone
    assert client.get(f"/user/by_id/{p['gold_annotator'].id}").status_code == 200


def test_delete_nonexistent_project(client: TestClient):
    project_id = 1234
    response = client.delete(f"/project/{project_id}")

    assert response.status_code == 403, response.text


# ===========================================================================
# PROJECT FEATURES: CREATE (/project) TESTS
# ===========================================================================


def test_create_project_enables_all_features_by_default(client: TestClient):
    """A project created without `enabled_features` enables every feature, so
    it behaves like every project before the feature toggles."""
    response = client.put("/project", json={"title": "All", "description": ""})

    assert response.status_code == 200, response.text
    project = ProjectRead.model_validate(response.json())
    assert project.enabled_features == list(Feature)


def test_create_project_enables_the_features_the_requested_ones_require(
    client: TestClient,
):
    """Requesting RAG chat also enables sentence similarity search."""
    create = ProjectCreate(
        title="RAG", description="", enabled_features=[Feature.RAG_CHAT]
    )

    response = client.put("/project", json=create.model_dump(mode="json"))

    assert response.status_code == 200, response.text
    project = ProjectRead.model_validate(response.json())
    assert project.enabled_features == [
        Feature.SENTENCE_SIMILARITY_SEARCH,
        Feature.RAG_CHAT,
    ]


# ===========================================================================
# UPDATE PROJECT (/project/{project_id}) TESTS
# ===========================================================================


def test_update_project_rejects_enabled_features(client: TestClient, test_project):
    """The enabled features change through the feature endpoints only: a project
    update with `enabled_features` is rejected as an empty update."""
    response = client.patch(
        f"/project/{test_project.id}", json={"enabled_features": []}
    )

    assert response.status_code == 422, response.text


def test_update_project_changes_the_title(client: TestClient, test_project):
    """The title changes, the enabled features stay."""
    update = ProjectUpdate(title="Renamed")

    response = client.patch(
        f"/project/{test_project.id}",
        json=update.model_dump(mode="json", exclude_unset=True),
    )

    assert response.status_code == 200, response.text
    project = ProjectRead.model_validate(response.json())
    assert project.title == "Renamed"
    assert project.enabled_features == list(Feature)
