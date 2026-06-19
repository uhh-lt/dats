import pytest
from fastapi.testclient import TestClient

from core.tag.tag_dto import (
    SourceDocumentTagMultiLink,
    TagCreate,
    TagRead,
    TagUpdate,
)


def test_create_new_doc_tag(
    client: TestClient,
    test_project,
):
    payload = TagCreate(
        name="Tag",
        color="Red",
        description="Tag Content",
        parent_id=None,
        project_id=test_project.id,
    )

    resp = client.put("/tag", json=payload.model_dump(exclude_none=True))

    assert resp.status_code == 200

    tag_assert = TagRead.model_validate(resp.json())

    assert tag_assert.name == payload.name
    assert tag_assert.color == payload.color
    assert tag_assert.description == payload.description
    assert tag_assert.parent_id == payload.parent_id


def test_create_new_doc_tag_if_not_exists(
    client: TestClient,
):
    not_exists_id = 9999

    payload = TagCreate(
        name="Tag",
        color="Red",
        description="Tag Content",
        parent_id=None,
        project_id=not_exists_id,
    )

    resp = client.put("/tag", json=payload.model_dump(exclude_none=True))

    assert resp.status_code == 403


def test_link_multiple_tags(
    client: TestClient,
    project_with_sdoc_and_multiple_tags,
):
    sdoc = project_with_sdoc_and_multiple_tags["source_document"]
    tag1 = project_with_sdoc_and_multiple_tags["tag1"]
    tag2 = project_with_sdoc_and_multiple_tags["tag2"]

    payload = SourceDocumentTagMultiLink(
        source_document_ids=[sdoc.id],
        tag_ids=[tag1.id, tag2.id],
    )
    resp = client.patch("/tag/bulk/link", json=payload.model_dump(exclude_none=True))

    assert resp.status_code == 200, resp.json()
    assert resp.json() == 2


def test_link_multiple_tags_not_exist(client: TestClient):
    payload = {
        "source_document_ids": [998, 999],
        "tag_ids": [889, 888],
    }

    resp = client.patch("/tag/bulk/link", json=payload)

    assert resp.status_code == 404, resp.text


def test_unlink_multiple_tags(
    client: TestClient,
    project_with_sdoc_and_multiple_tags,
):
    sdoc = project_with_sdoc_and_multiple_tags["source_document"]
    tag1 = project_with_sdoc_and_multiple_tags["tag1"]
    tag2 = project_with_sdoc_and_multiple_tags["tag2"]

    payload = {"source_document_ids": [sdoc.id], "tag_ids": [tag1.id, tag2.id]}
    resp = client.request("DELETE", "/tag/bulk/unlink", json=payload)

    assert resp.status_code == 200, resp.json()
    assert resp.json() == 2


def test_unlink_multiple_tags_not_exist(client: TestClient):
    payload = {"source_document_ids": [999], "tag_ids": [889, 888]}

    resp = client.request("DELETE", "/tag/bulk/unlink", json=payload)

    assert resp.status_code == 404, resp.text


def test_set_tags_batch(
    client: TestClient,
    project_with_sdoc_and_multiple_tags,
):
    sdoc = project_with_sdoc_and_multiple_tags["source_document"]
    tag1 = project_with_sdoc_and_multiple_tags["tag1"]
    tag2 = project_with_sdoc_and_multiple_tags["tag2"]

    payload = [
        {"source_document_id": sdoc.id, "tag_ids": [tag1.id, tag2.id]},
    ]
    resp = client.patch("/tag/bulk/set", json=payload)

    assert resp.status_code == 200, resp.json()
    assert resp.json() == 2


def test_set_tags_batch_not_exist(client: TestClient):
    payload = [{"source_document_id": 999, "tag_ids": [882, 881]}]

    resp = client.patch("/tag/bulk/set", json=payload)

    assert resp.status_code == 404, resp.text


testdata = [
    pytest.param([1], [2], 2, id="swap_t1_t2"),
    pytest.param([], [2], 1, id="link_only_t2"),
    pytest.param([1], [], 1, id="unlink_only_t1"),
]


@pytest.mark.parametrize("unlink_ids, link_ids, expected_count", testdata)
def test_update_tags_batch_parametrize(
    client: TestClient,
    project_with_sdoc_and_multiple_tags,
    unlink_ids: list[int],
    link_ids: list[int],
    expected_count: int,
):
    sdoc = project_with_sdoc_and_multiple_tags["source_document"]
    tag1 = project_with_sdoc_and_multiple_tags["tag"]
    tag2 = project_with_sdoc_and_multiple_tags["tag2"]

    payload = {
        "sdoc_ids": [sdoc.id],
        "unlink_tag_ids": [tag1.id] if unlink_ids else [],
        "link_tag_ids": [tag2.id] if link_ids else [],
    }
    resp = client.patch("/tag/bulk/update", json=payload)

    assert resp.status_code == 200
    assert resp.json() == expected_count


def test_update_tags_batch(
    client: TestClient,
    project_with_sdoc_and_multiple_tags,
):
    sdoc = project_with_sdoc_and_multiple_tags["source_document"]
    tag1 = project_with_sdoc_and_multiple_tags["tag"]
    tag2 = project_with_sdoc_and_multiple_tags["tag2"]

    payload = {
        "sdoc_ids": [sdoc.id],
        "unlink_tag_ids": [tag1.id],
        "link_tag_ids": [tag2.id],
    }
    resp = client.patch("/tag/bulk/update", json=payload)

    assert resp.status_code == 200
    assert resp.json() == 2


def test_update_tags_batch_not_exists(client: TestClient):
    payload = {
        "sdoc_ids": [999999],
        "unlink_tag_ids": [888888],
        "link_tag_ids": [777777],
    }

    resp = client.patch("/tag/bulk/update", json=payload)

    assert resp.status_code == 404, resp.text


def test_get_by_id(
    client: TestClient,
    project_with_sdoc_and_tag,
):
    tag = project_with_sdoc_and_tag["tag"]

    resp = client.get(f"/tag/{tag.id}")

    assert resp.status_code == 200


def test_get_by_id_if_not_exsis(client: TestClient):
    not_exists_id = 1441

    resp = client.get(f"/tag/{not_exists_id}")

    assert resp.status_code == 403


def test_get_tags_by_project(
    client: TestClient,
    project_with_sdoc_and_multiple_tags,
):
    project = project_with_sdoc_and_multiple_tags["project"]
    tag1 = project_with_sdoc_and_multiple_tags["tag1"]
    tag2 = project_with_sdoc_and_multiple_tags["tag2"]

    resp = client.get(f"/tag/project/{project.id}")

    assert resp.status_code == 200, resp.json()
    items = [TagRead.model_validate(x) for x in resp.json()]
    assert {t.id for t in items} == {tag1.id, tag2.id}


def test_get_tags_by_project_not_exists_id(client: TestClient):
    not_exists_id = 1441
    resp = client.get(f"/tag/project/{not_exists_id}")

    assert resp.status_code == 403, resp.json()


def test_get_by_sdoc(
    client: TestClient,
    project_with_sdoc_and_tag,
):
    sdoc = project_with_sdoc_and_tag["source_document"]
    tag = project_with_sdoc_and_tag["tag"]

    resp = client.get(f"/tag/sdoc/{sdoc.id}")

    assert resp.status_code == 200, resp.json()
    tag_ids = set(resp.json())
    assert tag_ids == {tag.id}


def test_get_by_sdoc_if_not_exists(client: TestClient):
    not_exists_id = 1441
    resp = client.get(f"/tag/sdoc/{not_exists_id}")

    assert resp.status_code == 403, resp.json()


testdata_tags = [
    pytest.param({"name": "New Tag Name"}, id="update_name_only"),
    pytest.param({"color": "red"}, id="update_color_only"),
    pytest.param({"description": "Updated Description"}, id="update_description_only"),
    pytest.param({"name": "Combined", "color": "yellow"}, id="update_multiple_fields"),
]


@pytest.mark.parametrize("payload", testdata_tags)
def test_update_tag_parametrized(
    client: TestClient,
    project_with_sdoc_and_multiple_tags,
    payload,
):
    tag = project_with_sdoc_and_multiple_tags["tag"]

    update_payload = TagUpdate(**payload)
    resp = client.patch(
        f"/tag/{tag.id}", json=update_payload.model_dump(exclude_none=True)
    )

    assert resp.status_code == 200
    updated = TagRead.model_validate(resp.json())
    if "name" in payload:
        assert updated.name == payload["name"]
    if "color" in payload:
        assert updated.color == payload["color"]
    if "description" in payload:
        assert updated.description == payload["description"]


def test_update_by_id(
    client: TestClient,
    project_with_sdoc_and_multiple_tags,
):
    tag = project_with_sdoc_and_multiple_tags["tag"]

    payload = TagUpdate(
        name="new name",
        color="blue",
        description="data2",
        parent_id=None,
    )
    resp = client.patch(f"/tag/{tag.id}", json=payload.model_dump(exclude_none=True))

    assert resp.status_code == 200
    updated = TagRead.model_validate(resp.json())
    assert updated.color == payload.color
    assert updated.name == payload.name
    assert updated.description == payload.description
    assert updated.parent_id is payload.parent_id


def test_update_tag_not_exists(client: TestClient):
    payload = TagUpdate(
        name="None", description="Content", parent_id=None, color="white"
    )
    resp = client.patch("/tag/999999", json=payload.model_dump(exclude_none=True))

    assert resp.status_code == 404
    assert "There exists no Tag" in resp.text


def test_delete_tag_by_id(
    client: TestClient,
    project_with_sdoc_and_tag,
):
    tag = project_with_sdoc_and_tag["tag"]
    project = project_with_sdoc_and_tag["project"]

    resp = client.delete(f"/tag/{tag.id}")

    assert resp.status_code == 200
    deleted = TagRead.model_validate(resp.json())
    assert deleted.id == tag.id
    assert deleted.project_id == project.id
    assert deleted.name == "Test Tag"
    assert deleted.color == "green"
    assert deleted.description is None
    assert deleted.parent_id is None


def test_delete_tag_by_id_if_not_exists(client: TestClient):
    not_exists_id = 3000
    resp = client.delete(f"/tag/{not_exists_id}")

    assert resp.status_code == 403


def test_get_sdoc_ids_by_tag_id(
    client: TestClient,
    project_with_multiple_sdocs_and_multiple_tags,
):
    tag = project_with_multiple_sdocs_and_multiple_tags["tag1"]
    sd1 = project_with_multiple_sdocs_and_multiple_tags["source_document1"]
    sd2 = project_with_multiple_sdocs_and_multiple_tags["source_document2"]

    resp = client.get(f"/tag/{tag.id}/sdocs")

    assert resp.status_code == 200
    ids = set(resp.json())
    assert ids == {sd1.id, sd2.id}


def test_get_sdoc_ids_by_tag_id_if_not_exists(client: TestClient):
    not_exists_id = 2000
    resp = client.get(f"/tag/{not_exists_id}/sdocs")

    assert resp.status_code == 403


def test_get_sdoc_counts(
    client: TestClient,
    project_with_multiple_sdocs_and_multiple_tags,
):
    project = project_with_multiple_sdocs_and_multiple_tags["project"]
    sdoc1 = project_with_multiple_sdocs_and_multiple_tags["source_document1"]
    sdoc2 = project_with_multiple_sdocs_and_multiple_tags["source_document2"]
    tag1 = project_with_multiple_sdocs_and_multiple_tags["tag1"]
    tag2 = project_with_multiple_sdocs_and_multiple_tags["tag2"]

    payload = [sdoc1.id, sdoc2.id]
    resp = client.post(f"/tag/sdoc_counts/{project.id}", json=payload)

    assert resp.status_code == 200, resp.json()
    data = resp.json()
    assert data.get(str(tag1.id)) == 1
    assert data.get(str(tag2.id)) == 2


def test_get_sdoc_counts_if_not_exists(client: TestClient):
    payload = [9000, 3000]
    resp = client.post("/tag/sdoc_counts/9999", json=payload)

    assert resp.status_code == 403, resp.text


def test_count_tags(
    client: TestClient,
    project_with_multiple_sdocs_and_multiple_tags,
):
    project = project_with_multiple_sdocs_and_multiple_tags["project"]
    test_user_id = project.users[0].id
    tag = project_with_multiple_sdocs_and_multiple_tags["tag1"]

    payload = {
        "sdoc_ids": [tag.source_documents[0].id, tag.source_documents[1].id],
        "class_ids": [tag.id],
    }
    resp = client.post(f"/tag/count_tags/{test_user_id}", json=payload)

    assert resp.status_code == 200, resp.json()
    data = resp.json()
    assert data.get(str(tag.id)) == 2


def test_count_tags_not_exists(client: TestClient):
    not_exists_id = 2000
    payload = {"sdoc_ids": [999999], "class_ids": [999999]}
    resp = client.post(f"/tag/count_tags/{not_exists_id}", json=payload)

    assert resp.status_code == 404, resp.text
