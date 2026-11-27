import pytest
from fastapi.testclient import TestClient

from common.meta_type_enum import MetaType
from composite_keys_test_utils import TwoTenants
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataRead,
    SourceDocumentMetadataUpdate,
    SourceDocumentMetadataUpdateBulk,
)


def test_get_by_id(
    client: TestClient,
    project_with_sdoc_and_projmeta_and_sdocmeta,
):
    sdoc = project_with_sdoc_and_projmeta_and_sdocmeta["source_document"]
    pm = project_with_sdoc_and_projmeta_and_sdocmeta["project_metadata"]
    metadata = project_with_sdoc_and_projmeta_and_sdocmeta["source_document_metadata"]

    resp = client.get(
        f"/projects/{metadata.project_id}/source-document-metadata/{metadata.id}"
    )

    assert resp.status_code == 200, resp.text
    body = SourceDocumentMetadataRead.model_validate(resp.json())
    assert body.id == metadata.id
    assert body.source_document_id == sdoc.id
    assert body.project_metadata_id == pm.id
    assert body.str_value == metadata.str_value
    assert body.int_value == metadata.int_value
    assert body.boolean_value == metadata.boolean_value
    assert body.date_value == metadata.date_value
    assert body.list_value == metadata.list_value


def test_get_by_id_if_not_exists(
    client: TestClient,
    test_project,
):
    fake_id = 3000
    resp = client.get(f"/projects/{test_project.id}/source-document-metadata/{fake_id}")

    assert resp.status_code == 404, resp.text


def test_get_by_sdoc(
    client: TestClient,
    project_with_sdoc_and_projmeta_and_sdocmeta,
):
    sdoc = project_with_sdoc_and_projmeta_and_sdocmeta["source_document"]
    pm = project_with_sdoc_and_projmeta_and_sdocmeta["project_metadata"]
    sm = project_with_sdoc_and_projmeta_and_sdocmeta["source_document_metadata"]

    resp = client.get(
        f"/projects/{sdoc.project_id}/source-document-metadata",
        params={"sdoc_id": sdoc.id},
    )

    assert resp.status_code == 200, resp.text
    items = [SourceDocumentMetadataRead.model_validate(x) for x in resp.json()]
    assert len(items) == 1
    got = items[0]
    assert got.id == sm.id
    assert got.source_document_id == sdoc.id
    assert got.project_metadata_id == pm.id
    assert got.str_value == sm.str_value
    assert got.int_value == sm.int_value
    assert got.boolean_value == sm.boolean_value
    assert got.date_value == sm.date_value
    assert got.list_value == sm.list_value


def test_get_by_sdoc_if_not_exists(client: TestClient, test_project):
    """A document that does not exist in the project matches nothing."""
    fake_id = 3000
    resp = client.get(
        f"/projects/{test_project.id}/source-document-metadata",
        params={"sdoc_id": fake_id},
    )

    assert resp.status_code == 200, resp.text
    assert resp.json() == []


def test_get_by_sdoc_and_key(
    client: TestClient,
    project_with_sdoc_and_projmeta_and_sdocmeta,
):
    sdoc = project_with_sdoc_and_projmeta_and_sdocmeta["source_document"]
    pm = project_with_sdoc_and_projmeta_and_sdocmeta["project_metadata"]
    sm = project_with_sdoc_and_projmeta_and_sdocmeta["source_document_metadata"]

    resp = client.get(
        f"/projects/{sdoc.project_id}/source-document-metadata",
        params={"sdoc_id": sdoc.id, "key": pm.key},
    )

    assert resp.status_code == 200, resp.text
    [body] = [SourceDocumentMetadataRead.model_validate(m) for m in resp.json()]
    assert body.id == sm.id
    assert body.source_document_id == sdoc.id
    assert body.project_metadata_id == pm.id
    assert body.str_value == sm.str_value
    assert body.int_value == sm.int_value
    assert body.boolean_value == sm.boolean_value
    assert body.date_value == sm.date_value
    assert body.list_value == sm.list_value


def test_get_by_sdoc_and_key_if_not_exists(client: TestClient, project_with_sdoc):
    sdoc = project_with_sdoc["source_document"]

    non_existing_key = "random-key"
    resp = client.get(
        f"/projects/{sdoc.project_id}/source-document-metadata",
        params={"sdoc_id": sdoc.id, "key": non_existing_key},
    )

    assert resp.status_code == 200, resp.text
    assert resp.json() == []


test_data_metadata_update = [
    pytest.param(
        {"field": "str_value", "new": "Neu", "type": MetaType.STRING},
        id="update_string",
    ),
]


@pytest.mark.parametrize("payload_1", test_data_metadata_update)
def test_update_sdoc_metadata(
    client: TestClient,
    project_with_sdoc_and_projmeta_and_sdocmeta,
    payload_1,
):
    sdoc = project_with_sdoc_and_projmeta_and_sdocmeta["source_document"]
    pm = project_with_sdoc_and_projmeta_and_sdocmeta["project_metadata"]
    sm = project_with_sdoc_and_projmeta_and_sdocmeta["source_document_metadata"]

    base = {
        "str_value": None,
        "int_value": None,
        "boolean_value": None,
        "date_value": None,
        "list_value": None,
    }
    payload = {**base, payload_1["field"]: payload_1["new"]}
    resp = client.patch(
        f"/projects/{sm.project_id}/source-document-metadata/{sm.id}", json=payload
    )

    assert resp.status_code == 200, resp.text
    updated = SourceDocumentMetadataRead.model_validate(resp.json())
    assert updated.id == sm.id
    assert updated.project_metadata_id == pm.id
    assert updated.source_document_id == sdoc.id
    assert updated.str_value == payload.get("str_value")
    assert updated.int_value == payload.get("int_value")
    assert updated.boolean_value == payload.get("boolean_value")
    if updated.date_value:
        assert updated.date_value.strftime("%Y-%m-%d") == payload.get("date_value")
    else:
        assert updated.date_value == payload.get("date_value")


def test_update_by_id_if_not_exists(
    client: TestClient,
    test_project,
):
    fake_id = 3000
    payload = SourceDocumentMetadataUpdate(
        str_value="Sports",
        int_value=None,
        date_value=None,
        list_value=None,
        boolean_value=None,
    )
    resp = client.patch(
        f"/projects/{test_project.id}/source-document-metadata/{fake_id}",
        json=payload.model_dump(),
    )

    assert resp.status_code == 404, resp.text


test_data_bulk_metadata = [
    pytest.param(
        {
            "field": "str_value",
            "new": "Sports",
            "type": MetaType.STRING,
        },
        id="bulk_update_string",
    ),
    pytest.param(
        {
            "field": "str_value",
            "new": "Sport is important",
            "type": MetaType.STRING,
        },
        id="bulk_update_string",
    ),
    pytest.param(
        {
            "field": "str_value",
            "new": "",
            "type": MetaType.STRING,
        },
        id="bulk_update_string",
    ),
    pytest.param(
        {
            "field": "str_value",
            "new": " ",
            "type": MetaType.STRING,
        },
        id="bulk_update_string",
    ),
]


@pytest.mark.parametrize("payload_1", test_data_bulk_metadata)
def test_update_bulk_metadata_parametrized(
    client: TestClient,
    project_with_sdoc_and_projmeta_and_sdocmeta,
    payload_1,
):
    sdoc = project_with_sdoc_and_projmeta_and_sdocmeta["source_document"]
    pm = project_with_sdoc_and_projmeta_and_sdocmeta["project_metadata"]
    sm = project_with_sdoc_and_projmeta_and_sdocmeta["source_document_metadata"]

    base = {
        "str_value": None,
        "int_value": None,
        "boolean_value": None,
        "date_value": None,
        "list_value": None,
    }
    payload = {**base, "sdoc_metadata_id": sm.id, payload_1["field"]: payload_1["new"]}
    resp = client.patch(
        f"/projects/{sdoc.project_id}/source-document-metadata/bulk", json=[payload]
    )

    assert resp.status_code == 200, resp.text
    updated = SourceDocumentMetadataRead.model_validate(resp.json()[0])
    assert updated.id == sm.id
    assert updated.project_id == sdoc.project_id
    assert updated.source_document_id == sdoc.id
    assert updated.project_metadata_id == pm.id
    assert updated.str_value == payload.get("str_value")
    assert updated.int_value == payload.get("int_value")
    assert updated.boolean_value == payload.get("boolean_value")
    assert updated.date_value == payload.get("date_value")
    assert updated.list_value == payload.get("list_value")


def test_update_bulk_if_id_not_exists(
    client: TestClient,
    test_project,
):
    non_existing_id = 3000
    payload = SourceDocumentMetadataUpdateBulk(
        sdoc_metadata_id=non_existing_id,
        str_value="Sports",
        int_value=None,
        date_value=None,
        list_value=None,
        boolean_value=None,
    )
    resp = client.patch(
        f"/projects/{test_project.id}/source-document-metadata/bulk",
        json=[payload.model_dump()],
    )

    assert resp.status_code == 404, resp.text


def test_delete_by_id(
    client: TestClient,
    project_with_sdoc_and_projmeta_and_sdocmeta,
):
    sdoc = project_with_sdoc_and_projmeta_and_sdocmeta["source_document"]
    pm = project_with_sdoc_and_projmeta_and_sdocmeta["project_metadata"]
    sm = project_with_sdoc_and_projmeta_and_sdocmeta["source_document_metadata"]

    response = client.delete(
        f"/projects/{sm.project_id}/source-document-metadata/{sm.id}"
    )

    assert response.status_code == 200, response.text
    deleted = SourceDocumentMetadataRead.model_validate(response.json())
    assert deleted.id == sm.id
    assert deleted.source_document_id == sdoc.id
    assert deleted.project_metadata_id == pm.id
    assert deleted.str_value == sm.str_value
    assert deleted.int_value == sm.int_value
    assert deleted.date_value == sm.date_value
    assert deleted.boolean_value == sm.boolean_value
    assert deleted.list_value == sm.list_value


def test_delete_by_id_if_not_exists(
    client: TestClient,
    test_project,
):
    fake_id = 30000
    response = client.delete(
        f"/projects/{test_project.id}/source-document-metadata/{fake_id}"
    )

    assert response.status_code == 404, response.text


# ===========================================================================
# UPDATE BULK (/projects/{project_id}/source-document-metadata/bulk)
# CROSS-PROJECT TESTS
# ===========================================================================


def test_update_bulk_with_metadata_of_another_project_is_not_found(
    client: TestClient, tenants: TwoTenants
):
    """A bulk update that names the document metadata of another project of the
    user answers 404 and changes nothing; the own metadata is updated."""
    own, foreign = tenants["own"], tenants["foreign"]
    url = f"/projects/{own['project'].id}/source-document-metadata"

    def update(sdoc_metadata_id: int):
        return client.patch(
            f"{url}/bulk",
            json=[
                SourceDocumentMetadataUpdateBulk(
                    sdoc_metadata_id=sdoc_metadata_id,
                    str_value="changed",
                    int_value=None,
                    boolean_value=None,
                    date_value=None,
                    list_value=None,
                ).model_dump(mode="json")
            ],
        )

    response = update(foreign["sdoc_metadata"].id)
    assert response.status_code == 404, response.text
    response = client.get(
        f"/projects/{foreign['project'].id}/source-document-metadata/"
        f"{foreign['sdoc_metadata'].id}"
    )
    assert response.json()["str_value"] == "value"

    response = update(own["sdoc_metadata"].id)
    assert response.status_code == 200, response.text
    assert [meta["str_value"] for meta in response.json()] == ["changed"]
