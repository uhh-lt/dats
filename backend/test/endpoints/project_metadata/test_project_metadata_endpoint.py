import pytest
from fastapi.testclient import TestClient

from common.doc_type_enum import DocType
from common.meta_type_enum import MetaType
from core.metadata.project_metadata_dto import (
    ProjectMetadataCreate,
    ProjectMetadataRead,
    ProjectMetadataUpdate,
    ProjectMetadataUpdateBulk,
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
    pytest.param({"metatype": MetaType.STRING}, id="update_metatype"),
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


@pytest.mark.parametrize(
    "payload",
    [
        # empty PATCH body
        pytest.param({}, id="empty"),
        # read_only is not updatable, so nothing is updated
        pytest.param({"read_only": False}, id="read_only"),
        # doctype is not updatable, so nothing is updated
        pytest.param({"doctype": DocType.text}, id="doctype"),
    ],
)
def test_update_by_id_rejects_update_without_updatable_field(
    client: TestClient,
    project_with_metadata,
    payload: dict,
):
    """A PATCH that sets none of key, metatype or description is rejected with 422."""
    metadata = project_with_metadata["metadata"][0]

    resp = client.patch(f"/projmeta/{metadata.id}", json=payload)

    assert resp.status_code == 422, resp.text
    assert "At least one field to update has to be set" in resp.text


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

    # read-only keys belong to the system: the update is rejected, nothing changes
    assert resp.status_code == 400, resp.text
    assert ro_meta.key in resp.text
    unchanged = ProjectMetadataRead.model_validate(
        client.get(f"/projmeta/{ro_meta.id}").json()
    )
    assert unchanged.key == ro_meta.key


def test_delete_read_only(
    client: TestClient,
    project_with_metadata,
):
    """Deleting a read-only key is rejected and the key stays."""
    ro_meta = next(m for m in project_with_metadata["metadata"] if m.read_only)

    resp = client.delete(f"/projmeta/{ro_meta.id}")

    assert resp.status_code == 400, resp.text
    assert client.get(f"/projmeta/{ro_meta.id}").status_code == 200


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


# ===========================================================================
# UPDATE PROJECT METADATA BULK (/projmeta/bulk/update) TESTS
# ===========================================================================


def test_update_project_metadata_bulk_updates_each_key(
    client: TestClient, project_with_metadata
):
    """Every key gets its own changes; the results keep the request order and the
    metatype stays unchanged when it is not sent."""
    category, date = project_with_metadata["metadata"][:2]
    request = [
        ProjectMetadataUpdateBulk(project_metadata_id=date.id, key="published"),
        ProjectMetadataUpdateBulk(
            project_metadata_id=category.id, description="The genre"
        ),
    ]

    response = client.patch(
        "/projmeta/bulk/update",
        json=[update.model_dump(exclude_unset=True) for update in request],
    )

    assert response.status_code == 200, response.text
    results = [ProjectMetadataRead.model_validate(m) for m in response.json()]
    assert [(m.id, m.key, m.description, m.metatype) for m in results] == [
        (date.id, "published", "The date of the document", MetaType.DATE),
        (category.id, "category", "The genre", MetaType.STRING),
    ]


def test_update_project_metadata_bulk_rejects_read_only_keys_without_changes(
    client: TestClient, project_with_metadata
):
    """A read-only key fails the whole update with 400, and no key is changed."""
    category = project_with_metadata["metadata"][0]
    category_ro = project_with_metadata["metadata"][5]

    response = client.patch(
        "/projmeta/bulk/update",
        json=[
            {"project_metadata_id": category.id, "description": "changed"},
            {"project_metadata_id": category_ro.id, "description": "changed"},
        ],
    )

    assert response.status_code == 400, response.text
    assert "category_ro" in response.text
    response = client.get(f"/projmeta/{category.id}")
    assert response.status_code == 200, response.text
    assert ProjectMetadataRead.model_validate(response.json()).description == (
        "The category of the document"
    )


def test_update_project_metadata_bulk_rejects_a_taken_key(
    client: TestClient, project_with_metadata
):
    """Keys are unique per document type: a taken key fails the update with 409."""
    category, date = project_with_metadata["metadata"][:2]

    response = client.patch(
        "/projmeta/bulk/update",
        json=[{"project_metadata_id": date.id, "key": category.key}],
    )

    assert response.status_code == 409, response.text


def test_update_project_metadata_bulk_rejects_unknown_keys(
    client: TestClient, project_with_metadata
):
    """A key that does not exist (or belongs to a foreign project) is forbidden."""
    category = project_with_metadata["metadata"][0]

    response = client.patch(
        "/projmeta/bulk/update",
        json=[
            {"project_metadata_id": category.id, "key": "a"},
            {"project_metadata_id": 999999, "key": "b"},
        ],
    )

    assert response.status_code == 403, response.text
