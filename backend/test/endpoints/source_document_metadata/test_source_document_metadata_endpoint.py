import pytest
from fastapi.testclient import TestClient

from common.meta_type import MetaType
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataBulkUpdate,
    SourceDocumentMetadataRead,
    SourceDocumentMetadataUpdate,
)


def test_get_by_id(
    client: TestClient,
    project_with_sdoc_and_projmeta_and_sdocmeta,
):
    sdoc = project_with_sdoc_and_projmeta_and_sdocmeta["source_document"]
    pm = project_with_sdoc_and_projmeta_and_sdocmeta["project_metadata"]
    metadata = project_with_sdoc_and_projmeta_and_sdocmeta["source_document_metadata"]

    resp = client.get(f"/sdocmeta/{metadata.id}")

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
):
    fake_id = 3000
    resp = client.get(f"/sdocmeta/{fake_id}")

    assert resp.status_code == 403, resp.text


def test_get_by_sdoc(
    client: TestClient,
    project_with_sdoc_and_projmeta_and_sdocmeta,
):
    sdoc = project_with_sdoc_and_projmeta_and_sdocmeta["source_document"]
    pm = project_with_sdoc_and_projmeta_and_sdocmeta["project_metadata"]
    sm = project_with_sdoc_and_projmeta_and_sdocmeta["source_document_metadata"]

    resp = client.get(f"/sdocmeta/sdoc/{sdoc.id}")

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


def test_get_by_sdoc_if_not_exists(
    client: TestClient,
):
    fake_id = 3000
    resp = client.get(f"/sdocmeta/sdoc/{fake_id}")

    assert resp.status_code == 403, resp.text


def test_get_by_sdoc_and_key(
    client: TestClient,
    project_with_sdoc_and_projmeta_and_sdocmeta,
):
    sdoc = project_with_sdoc_and_projmeta_and_sdocmeta["source_document"]
    pm = project_with_sdoc_and_projmeta_and_sdocmeta["project_metadata"]
    sm = project_with_sdoc_and_projmeta_and_sdocmeta["source_document_metadata"]

    resp = client.get(f"/sdocmeta/sdoc/{sdoc.id}/metadata/{pm.key}")

    assert resp.status_code == 200, resp.text
    body = SourceDocumentMetadataRead.model_validate(resp.json())
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
    resp = client.get(f"/sdocmeta/sdoc/{sdoc.id}/metadata/{non_existing_key}")

    assert resp.status_code == 404, resp.text


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
    resp = client.patch(f"/sdocmeta/{sm.id}", json=payload)

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
):
    fake_id = 3000
    payload = SourceDocumentMetadataUpdate(
        str_value="Sports",
        int_value=None,
        date_value=None,
        list_value=None,
        boolean_value=None,
    )
    resp = client.patch(f"/sdocmeta/{fake_id}", json=payload.model_dump())

    assert resp.status_code == 403, resp.text


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
    payload = {**base, "id": sm.id, payload_1["field"]: payload_1["new"]}
    resp = client.patch("/sdocmeta/bulk/update", json=[payload])

    assert resp.status_code == 200, resp.text
    updated = SourceDocumentMetadataRead.model_validate(resp.json()[0])
    assert updated.id == sm.id
    assert updated.source_document_id == sdoc.id
    assert updated.project_metadata_id == pm.id
    assert updated.str_value == payload.get("str_value")
    assert updated.int_value == payload.get("int_value")
    assert updated.boolean_value == payload.get("boolean_value")
    assert updated.date_value == payload.get("date_value")
    assert updated.list_value == payload.get("list_value")


def test_update_bulk_if_id_not_exists(
    client: TestClient,
):
    non_existing_id = 3000
    payload = SourceDocumentMetadataBulkUpdate(
        id=non_existing_id,
        str_value="Sports",
        int_value=None,
        date_value=None,
        list_value=None,
        boolean_value=None,
    )
    resp = client.patch(
        "/sdocmeta/bulk/update",
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

    response = client.delete(f"/sdocmeta/{sm.id}")

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
):
    fake_id = 30000
    response = client.delete(f"/sdocmeta/{fake_id}")

    assert response.status_code == 403, response.text
