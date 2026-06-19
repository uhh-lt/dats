from fastapi.testclient import TestClient


def test_create_new_project(client):
    payload = {
        "title": "My First Test Project",
        "description": "Testing create endpoint",
    }
    response = client.put("/project", json=payload)

    assert response.status_code == 200
    project = response.json()
    assert project["title"] == payload["title"]
    assert project["description"] == payload["description"]


def test_delete_existing_project(client: TestClient, test_project):
    response = client.delete(f"/project/{test_project.id}")

    assert response.status_code == 200
    project = response.json()
    assert project["id"] == test_project.id
    assert project["title"] == test_project.title
    assert project["description"] == test_project.description


def test_delete_nonexistent_project(client: TestClient):
    project_id = 1234
    response = client.delete(f"/project/{project_id}")

    assert response.status_code == 403
