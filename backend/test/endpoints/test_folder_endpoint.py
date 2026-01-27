import pytest
from fastapi.testclient import TestClient

from core.doc.folder_dto import (
    FolderCreate,
    FolderRead,
    FolderType,
    FolderUpdate,
)
from core.user.user_dto import UserRead


def test_create_folder(
    client: TestClient, project_factory, test_user: UserRead
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    payload = FolderCreate(
        name="My Folder",
        folder_type=FolderType.NORMAL,
        parent_id=None,
        project_id=project.id,
    )

    response = client.post("/folder/", json=payload.model_dump())
    assert response.status_code == 200

    folder = FolderRead.model_validate(response.json())
    assert folder.name == payload.name
    assert folder.folder_type == payload.folder_type
    assert folder.parent_id == payload.parent_id
    assert folder.project_id == payload.project_id


# test/endpoints/test_folder_endpoint.py  (replace this test)


def test_create_folder_if_not_exists(
    client: TestClient, project_factory, test_user: UserRead
):
    project_factory.create(creating_user_id=test_user.id)

    non_existing_project_id = 9999999
    payload = FolderCreate(
        name="My Folder",
        folder_type=FolderType.NORMAL,
        parent_id=None,
        project_id=non_existing_project_id,
    )

    response = client.put("/folder/", json=payload.model_dump())
    assert response.status_code == 405


def test_get_folder_by_id(
    client: TestClient, project_factory, folder_factory, test_user: UserRead
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)

    folder = folder_factory.create(
        FolderCreate(
            name="Get Test",
            folder_type=FolderType.NORMAL,
            parent_id=None,
            project_id=project.id,
        )
    )

    response = client.get(f"/folder/{folder.id}")
    assert response.status_code == 200

    folder_read = FolderRead.model_validate(response.json())
    assert folder_read.id == folder.id
    assert folder_read.name == folder.name
    assert folder_read.folder_type == folder.folder_type
    assert folder_read.parent_id == folder.parent_id
    assert folder_read.project_id == folder.project_id


def test_get_folder_by_id_if_not_exists(
    client: TestClient, test_user: UserRead, project_factory
):
    project_factory.create(creating_user_id=test_user.id)

    non_existing_folder_id = 999_999

    response = client.get(f"/folder/{non_existing_folder_id}")
    assert response.status_code == 403


testdata = [
    pytest.param({"name": "New Folder Name"}, id="change_name"),
    pytest.param({"parent_id": None}, id="move_to_root"),
]


@pytest.mark.parametrize("payload", testdata)
def test_update_folder_parametrized(
    client: TestClient,
    project_factory,
    folder_factory,
    test_user: UserRead,
    payload: dict,
) -> None:
    project = project_factory.create(creating_user_id=test_user.id)
    folder = folder_factory.create(
        FolderCreate(
            name="Old",
            folder_type=FolderType.NORMAL,
            parent_id=None,
            project_id=project.id,
        )
    )

    response = client.put(f"/folder/{folder.id}", json=payload)
    assert response.status_code == 200

    updated = FolderRead.model_validate(response.json())

    assert updated.name == payload.get("name", folder.name)
    assert updated.parent_id == payload.get("parent_id", folder.parent_id)

    assert updated.id == folder.id
    assert updated.project_id == project.id


def test_update_folder(
    client: TestClient, project_factory, folder_factory, test_user: UserRead
):
    project = project_factory.create(creating_user_id=test_user.id)
    folder = folder_factory.create(
        FolderCreate(
            name="Old",
            folder_type=FolderType.NORMAL,
            parent_id=None,
            project_id=project.id,
        )
    )

    update = FolderUpdate(
        name="Updated Name",
        parent_id=None,
    )
    response = client.put(f"/folder/{folder.id}", json=update.model_dump())

    assert response.status_code == 200
    updated = FolderRead.model_validate(response.json())
    assert updated.name == update.name
    assert updated.parent_id == update.parent_id


def test_update_folder_if_not_exists(
    client: TestClient, project_factory, test_user: UserRead
):
    project_factory.create(creating_user_id=test_user.id)

    non_existing_folder_id = 999
    update = FolderUpdate(
        name="Updated Name",
        parent_id=None,
    )
    response = client.put(f"/folder/{non_existing_folder_id}", json=update.model_dump())

    assert response.status_code == 403


def test_delete_folder(
    client: TestClient, project_factory, folder_factory, test_user: UserRead
):
    project = project_factory.create(creating_user_id=test_user.id)
    folder = folder_factory.create(
        FolderCreate(
            name="Delete",
            folder_type=FolderType.NORMAL,
            parent_id=None,
            project_id=project.id,
        )
    )

    response = client.delete(f"/folder/{folder.id}")

    assert response.status_code == 200
    deleted = FolderRead.model_validate(response.json())
    assert deleted.id == folder.id
    assert deleted.name == folder.name


def test_delete_folder_if_not_exists(
    client: TestClient, project_factory, test_user: UserRead
):
    project_factory.create(creating_user_id=test_user.id)
    non_existing_folder_id = 999_999

    resp = client.delete(f"/folder/{non_existing_folder_id}")
    assert resp.status_code == 403


def test_get_folders_by_project_and_type(
    client: TestClient, project_factory, folder_factory, test_user: UserRead
):
    project = project_factory.create(creating_user_id=test_user.id)
    folder = folder_factory.create(
        FolderCreate(
            name="Folder A",
            folder_type=FolderType.NORMAL,
            parent_id=None,
            project_id=project.id,
        )
    )

    response = client.get(
        f"/folder/project/{project.id}/folder/{FolderType.NORMAL.value}"
    )

    assert response.status_code == 200
    folders = [FolderRead.model_validate(f) for f in response.json()]
    assert len(folders) == 1
    assert folders[0].id == folder.id
    assert folders[0].folder_type == FolderType.NORMAL


def test_get_folders_by_project_and_type_if_not_exists(
    client: TestClient, project_factory, test_user: UserRead
):
    # Kontext: gültiger User, aber Projekt-ID ist ungültig
    project_factory.create(creating_user_id=test_user.id)
    non_existing_project_id = 999_999

    resp = client.get(
        f"/folder/project/{non_existing_project_id}/folder/{FolderType.NORMAL.value}"
    )
    assert resp.status_code == 403
