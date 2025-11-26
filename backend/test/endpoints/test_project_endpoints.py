from fastapi.testclient import TestClient
from test.factories.project_factory import ProjectFactory

from core.user.user_dto import UserRead


def test_create_new_project(client):
    payload = {
        "title": "My First Test Project",
        "description": "Testing create endpoint",
    }

    response = client.put("/project", json=payload)

    if response.status_code != 200:
        print("\n>>> ERROR RESPONSE:")
        print(f"Status: {response.status_code}")
        try:
            print("Body (JSON):", response.json())
        except Exception:
            print("Body (Text):", response.text)
        print("---------------------------\n")

    assert response.status_code == 200

    # TODO Test more!


def test_delete_existing_project(
    client: TestClient, project_factory: ProjectFactory, test_user: UserRead
):
    project = project_factory.create(creating_user_id=test_user.id)

    project_id = project.id
    response = client.delete(f"/project/{project_id}")

    if response.status_code != 200:
        print("\n>>> ERROR RESPONSE:")
        print(f"Status: {response.status_code}")
        try:
            print("Body (JSON):", response.json())
        except Exception:
            print("Body (Text):", response.text)
        print("---------------------------\n")

    assert response.status_code == 200

    # TODO Test more!


def test_delete_nonexistent_project(client: TestClient):
    project_id = 1234
    response = client.delete(f"/project/{project_id}")

    if response.status_code != 403:
        print("\n>>> ERROR RESPONSE:")
        print(f"Status: {response.status_code}")
        try:
            print("Body (JSON):", response.json())
        except Exception:
            print("Body (Text):", response.text)
        print("---------------------------\n")

    assert response.status_code == 403

    # TODO Test more!
