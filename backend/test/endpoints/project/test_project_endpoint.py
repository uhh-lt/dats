import pytest
from fastapi.testclient import TestClient
from rq.exceptions import NoSuchJobError

from core.project.project_crud import crud_project
from core.project.project_dto import (
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
)
from experiment_test_utils import RunUserProject
from systems.feature_system.feature_registry import Feature, feature_registry
from systems.job_system.job_service import JobService

from .conftest import ProjectsWithJobs

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


def test_delete_project_removes_only_its_own_jobs(
    client: TestClient, projects_with_jobs: ProjectsWithJobs
):
    """Deleting a project deletes its finished and queued jobs from Redis; the
    jobs of another project survive."""
    p = projects_with_jobs

    response = client.delete(f"/project/{p['deleted'].id}")

    assert response.status_code == 200, response.text
    js = JobService()
    for job_id in p["deleted_job_ids"]:
        with pytest.raises(NoSuchJobError):
            js.get_job(job_id)
    for job_id in p["kept_job_ids"]:
        assert js.get_job(job_id).get_project_id() == p["kept"].id


def test_delete_nonexistent_project(client: TestClient):
    project_id = 1234
    response = client.delete(f"/project/{project_id}")

    assert response.status_code == 403, response.text


# ===========================================================================
# PROJECT FEATURES: CREATE (/project) TESTS
# ===========================================================================


def test_create_project_enables_the_default_features(client: TestClient):
    """A project created without `enabled_features` enables the features that
    declare `default_enabled`, stored sorted by name."""
    response = client.put("/project", json={"title": "All", "description": ""})

    assert response.status_code == 200, response.text
    project = ProjectRead.model_validate(response.json())
    assert project.enabled_features == sorted(
        f.name for f in feature_registry.defaults()
    )


def test_create_project_does_not_enable_a_feature_off_by_default(
    client: TestClient, off_by_default: Feature
):
    """A feature with `default_enabled=False` is not enabled in a project
    created without `enabled_features`, but can be requested by name."""
    default = client.put("/project", json={"title": "Default", "description": ""})
    requested = client.put(
        "/project",
        json=ProjectCreate(
            title="Requested", description="", enabled_features=[off_by_default.name]
        ).model_dump(mode="json"),
    )

    assert default.status_code == 200, default.text
    assert (
        off_by_default.name
        not in ProjectRead.model_validate(default.json()).enabled_features
    )
    assert requested.status_code == 200, requested.text
    assert ProjectRead.model_validate(requested.json()).enabled_features == [
        off_by_default.name
    ]


def test_create_project_with_an_unknown_feature_is_rejected(
    client: TestClient, db_session
):
    """A feature name the backend does not know answers 404, and no project is
    created."""
    create = ProjectCreate(
        title="Unknown", description="", enabled_features=["no_such_feature"]
    )

    response = client.put("/project", json=create.model_dump(mode="json"))

    assert response.status_code == 404, response.text
    assert "no_such_feature" in response.text
    assert crud_project.read_by_title(db=db_session, title="Unknown") is None


def test_create_project_enables_only_the_requested_features(
    client: TestClient,
):
    """Requesting RAG chat enables RAG chat alone, not the other features that
    need the sentence embeddings."""
    create = ProjectCreate(title="RAG", description="", enabled_features=["rag_chat"])

    response = client.put("/project", json=create.model_dump(mode="json"))

    assert response.status_code == 200, response.text
    project = ProjectRead.model_validate(response.json())
    assert project.enabled_features == ["rag_chat"]


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
    assert project.enabled_features == sorted(
        f.name for f in feature_registry.defaults()
    )
