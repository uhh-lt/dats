import pytest
from fastapi.testclient import TestClient

from common.doc_type import DocType
from common.meta_type import MetaType
from core.metadata.project_metadata_dto import (
    ProjectMetadataCreate,
    ProjectMetadataRead,
    ProjectMetadataUpdate,
)


def test_create_new_metadata(client: TestClient, test_project):
    payload = ProjectMetadataCreate(
        project_id=test_project.id,
        key="new_field",
        metatype=MetaType.BOOLEAN,
        read_only=False,
        doctype=list(DocType)[0],
        description="A brand new metadata field",
    )
    resp = client.put("/projmeta", json=payload.model_dump())

    assert resp.status_code == 200, resp.text
    new_metadata = ProjectMetadataRead.model_validate(resp.json())
    assert new_metadata.project_id == payload.project_id
    assert new_metadata.key == payload.key
    assert new_metadata.metatype == payload.metatype
    assert new_metadata.read_only == payload.read_only
    assert new_metadata.doctype == payload.doctype
    assert new_metadata.description == payload.description


def test_create_new_metadata_if_not_exists(client: TestClient):
    payload = ProjectMetadataCreate(
        project_id=99999,
        key="test_forbidden",
        metatype=MetaType.STRING,
        read_only=False,
        doctype=list(DocType)[0],
        description="Forbidden test",
    )
    resp = client.put("/projmeta", json=payload.model_dump())

    assert resp.status_code == 403, resp.text


def test_get_by_id(
    client: TestClient,
    project_with_metadata,
):
    project = project_with_metadata["project"]
    metadata = project_with_metadata["metadata"][0]

    resp = client.get(f"/projmeta/{metadata.id}")

    assert resp.status_code == 200, resp.text
    meta_read = ProjectMetadataRead.model_validate(resp.json())
    assert meta_read.id == metadata.id
    assert meta_read.project_id == project.id
    assert meta_read.key == metadata.key
    assert meta_read.metatype == metadata.metatype
    assert meta_read.read_only == metadata.read_only
    assert meta_read.doctype == metadata.doctype
    assert meta_read.description == metadata.description


def test_get_by_id_if_not_exists(client: TestClient):
    non_existing_id = 99999
    resp = client.get(f"/projmeta/{non_existing_id}")

    assert resp.status_code == 403, resp.text


def test_get_by_project(
    client: TestClient,
    project_with_metadata,
):
    project = project_with_metadata["project"]
    metadata = project_with_metadata["metadata"]

    resp = client.get(f"/projmeta/project/{project.id}")

    assert resp.status_code == 200, resp.text
    meta_list = resp.json()
    assert len(meta_list) >= len(metadata)


def test_get_by_project_if_not_exists(client: TestClient):
    non_existing_project_id = 777777
    resp = client.get(f"/projmeta/project/{non_existing_project_id}")

    assert resp.status_code == 403, resp.text


testdata_project_metadata_update = [
    pytest.param({"description": "Updated Description"}, id="update_description"),
    pytest.param({"key": "updated_key"}, id="update_key"),
    pytest.param({"read_only": False}, id="update_read_only"),
    pytest.param({"metatype": MetaType.STRING}, id="update_metatype"),
    pytest.param({"doctype": DocType.text}, id="update_doctype"),
    pytest.param({"key": "new_key", "description": "new_desc"}, id="update_multiple"),
]


@pytest.mark.parametrize("payload", testdata_project_metadata_update)
def test_update_by_id(
    client: TestClient,
    project_with_metadata,
    payload: dict,
):
    project = project_with_metadata["project"]
    metadata = project_with_metadata["metadata"][0]

    resp = client.patch(f"/projmeta/{metadata.id}", json=payload)

    assert resp.status_code == 200, resp.text
    updated = ProjectMetadataRead.model_validate(resp.json())
    assert updated.id == metadata.id
    assert updated.project_id == project.id
    assert updated.key == payload.get("key", metadata.key)
    assert updated.description == payload.get("description", metadata.description)
    assert updated.read_only == payload.get("read_only", metadata.read_only)
    assert updated.metatype == payload.get("metatype", metadata.metatype)
    assert updated.doctype == payload.get("doctype", metadata.doctype)


def test_update_by_id_if_not_exists(
    client: TestClient,
):
    payload = ProjectMetadataUpdate(description="Updated", key="new_key")
    non_exists_id = 99999
    resp = client.patch(
        f"/projmeta/{non_exists_id}", json=payload.model_dump(exclude_none=True)
    )

    assert resp.status_code == 403, resp.text


def test_update_read_only(
    client: TestClient,
    project_with_metadata,
):
    # Find a read-only metadata or create one
    metadata = project_with_metadata["metadata"]
    ro_meta = None
    for m in metadata:
        if m.read_only:
            ro_meta = m
            break
    assert ro_meta is not None, "No read-only metadata found for the project."

    payload = ProjectMetadataUpdate(key="ignored_key_change")
    resp = client.patch(
        f"/projmeta/{ro_meta.id}", json=payload.model_dump(exclude_none=True)
    )

    assert resp.status_code == 200, resp.text
    updated = ProjectMetadataRead.model_validate(resp.json())
    assert updated.id == ro_meta.id
    assert updated.key == ro_meta.key, (
        "Key should not be updated for read-only metadata"
    )


def test_update_read_only_if_not_exists(
    client: TestClient,
):
    non_exists_id = 99999
    payload = ProjectMetadataUpdate(key="Key of the ProjectMetadata")
    resp = client.patch(
        f"/projmeta/{non_exists_id}", json=payload.model_dump(exclude_none=True)
    )

    assert resp.status_code == 403, resp.text


def test_delete_by_id(
    client: TestClient,
    project_with_metadata,
):
    metadata = project_with_metadata["metadata"][0]

    resp = client.delete(f"/projmeta/{metadata.id}")

    assert resp.status_code == 200, resp.text


def test_delete_by_id_if_not_exists(
    client: TestClient,
):
    non_exists_id = 99999
    resp = client.delete(f"/projmeta/{non_exists_id}")

    assert resp.status_code == 403, resp.text
