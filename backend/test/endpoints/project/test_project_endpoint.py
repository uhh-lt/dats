from fastapi.testclient import TestClient

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
