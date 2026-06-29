import pytest
from fastapi.testclient import TestClient

from core.annotation.span_annotation_dto import (
    SpanAnnotationCreate,
    SpanAnnotationDeleted,
    SpanAnnotationRead,
    SpanAnnotationUpdate,
)
from core.annotation.span_group_dto import SpanGroupRead


def test_add_span_annotation(
    client: TestClient,
    project_with_span_annotation,
) -> None:
    span_annotation = project_with_span_annotation["span_annotation"]
    sdoc = project_with_span_annotation["source_document"]
    code = project_with_span_annotation["code"]

    assert span_annotation.id > 0
    assert span_annotation.sdoc_id == sdoc.id
    assert span_annotation.code_id == code.id


def test_add_span_annotation_if_not_exists(
    client: TestClient,
) -> None:
    fake_id = 3000
    payload = SpanAnnotationCreate(
        sdoc_id=fake_id,
        code_id=fake_id,
        begin=0,
        end=5,
        begin_token=1,
        end_token=50,
        span_text="Span",
    )

    resp = client.put("/span", json=payload.model_dump(exclude_none=True))

    assert resp.status_code == 403, resp.text


def test_add_span_annotations_bulk(
    client: TestClient,
    project_with_span_annotation,
) -> None:
    sdoc = project_with_span_annotation["source_document"]
    code = project_with_span_annotation["code"]

    payload = [
        SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=10,
            end=15,
            begin_token=2,
            end_token=3,
            span_text="Span 3",
        ).model_dump(exclude_none=True),
        SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=16,
            end=20,
            begin_token=4,
            end_token=5,
            span_text="Span 4",
        ).model_dump(exclude_none=True),
    ]

    resp = client.put("/span/bulk/create", json=payload)

    assert resp.status_code == 200, resp.text

    items = [SpanAnnotationRead.model_validate(x) for x in resp.json()]
    assert len(items) == 2
    assert all(i.code_id == code.id and i.sdoc_id == sdoc.id for i in items)


def test_add_span_annotations_bulk_if_not_exists(
    client: TestClient,
) -> None:
    payload = SpanAnnotationCreate(
        sdoc_id=9000,
        code_id=9000,
        begin=0,
        end=5,
        begin_token=1,
        end_token=50,
        span_text="Span",
    )

    resp = client.put(
        "/span/bulk/create/", json=[payload.model_dump(exclude_none=True)]
    )

    assert resp.status_code == 403, resp.text


def test_get_by_id(
    client: TestClient,
    project_with_span_annotation,
) -> None:
    span_annotation = project_with_span_annotation["span_annotation"]
    sdoc = project_with_span_annotation["source_document"]
    code = project_with_span_annotation["code"]

    resp = client.get(f"/span/{span_annotation.id}")

    assert resp.status_code == 200, resp.text
    span_read = SpanAnnotationRead.model_validate(resp.json())
    assert span_read.id == span_annotation.id
    assert span_read.code_id == code.id
    assert span_read.sdoc_id == sdoc.id
    assert span_read.begin == span_annotation.begin
    assert span_read.end == span_annotation.end
    assert span_read.begin_token == span_annotation.begin_token
    assert span_read.end_token == span_annotation.end_token


def test_get_by_id_if_id_not_exists(
    client: TestClient,
) -> None:
    fake_nummer = 3000

    resp = client.get(f"/span/{fake_nummer}")

    assert resp.status_code == 403, resp.text


def test_get_by_sdoc_and_user(
    client: TestClient, project_with_span_annotation, test_user
) -> None:
    sdoc = project_with_span_annotation["source_document"]
    code = project_with_span_annotation["code"]
    span_annotation = project_with_span_annotation["span_annotation"]

    resp = client.get(f"/span/sdoc/{sdoc.id}/user/{test_user.id}")

    assert resp.status_code == 200, resp.text
    assert len(resp.json()) == 1
    span_read = SpanAnnotationRead.model_validate(resp.json()[0])
    assert span_read.sdoc_id == sdoc.id
    assert span_read.code_id == code.id
    assert span_read.begin == span_annotation.begin
    assert span_read.end == span_annotation.end
    assert span_read.begin_token == span_annotation.begin_token
    assert span_read.end_token == span_annotation.end_token


def test_get_by_sdoc_and_user_both_ids_not_exist(
    client: TestClient,
) -> None:
    sdoc_id = 99999
    user_id = 99999

    resp = client.get(f"/span/sdoc/{sdoc_id}/user/{user_id}")

    assert resp.status_code == 403, resp.text


test_data_span_update = [
    pytest.param({"code_id": 0}, id="update_code_only"),
]


@pytest.mark.parametrize("payload", test_data_span_update)
def test_update_by_id(
    client: TestClient,
    project_with_span_annotations_for_bulk_test,
    payload,
) -> None:
    span_annotation = project_with_span_annotations_for_bulk_test["span_annotation"]
    code2 = project_with_span_annotations_for_bulk_test["code2"]
    sdoc = project_with_span_annotations_for_bulk_test["source_document"]

    if "code_id" in payload:
        payload["code_id"] = code2.id

    resp = client.patch(
        f"/span/{span_annotation.id}",
        json=payload,
    )

    assert resp.status_code == 200, resp.text
    updated = SpanAnnotationRead.model_validate(resp.json())
    assert updated.id == span_annotation.id
    assert updated.code_id == payload.get("code_id", code2.id)
    assert updated.sdoc_id == sdoc.id


def test_update_by_id_if_not_exists(client: TestClient) -> None:
    non_existing_span_anno_id = 9999
    payload = SpanAnnotationUpdate(code_id=1)

    resp = client.patch(
        f"/span/{non_existing_span_anno_id}",
        json=payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 403, resp.text


def test_update_span_annotations_bulk(
    client: TestClient,
    project_with_span_annotations_for_bulk_test,
) -> None:
    code2 = project_with_span_annotations_for_bulk_test["code2"]
    span_annotation = project_with_span_annotations_for_bulk_test["span_annotation"]
    span_annotation2 = project_with_span_annotations_for_bulk_test["span_annotation2"]

    payload = [
        {"span_annotation_id": span_annotation.id, "code_id": code2.id},
        {"span_annotation_id": span_annotation2.id, "code_id": code2.id},
    ]
    resp = client.patch("/span/bulk/update", json=payload)

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert {item["id"]: item["code_id"] for item in body} == {
        span_annotation.id: code2.id,
        span_annotation2.id: code2.id,
    }


def test_update_span_annotations_bulk_not_exists(
    client: TestClient,
) -> None:
    payload = [
        {"span_annotation_id": 9991, "code_id": 1},
        {"span_annotation_id": 9992, "code_id": 1},
    ]

    resp = client.patch("/span/bulk/update", json=payload)

    assert resp.status_code == 403, resp.text


def test_delete_span_annotation_by_id(
    client: TestClient,
    project_with_span_annotation,
) -> None:
    span_annotation = project_with_span_annotation["span_annotation"]
    sdoc = project_with_span_annotation["source_document"]
    code = project_with_span_annotation["code"]

    resp = client.delete(f"/span/{span_annotation.id}")

    deleted = resp.json()
    assert deleted["id"] == span_annotation.id
    assert deleted["sdoc_id"] == sdoc.id
    assert deleted["code_id"] == code.id
    assert deleted["begin"] == span_annotation.begin
    assert deleted["end"] == span_annotation.end


def test_delete_span_annotation_by_id_if_not_exists(
    client: TestClient,
) -> None:
    resp = client.delete("/span/999999")

    assert resp.status_code == 403, resp.text


def test_delete_span_annotations_bulk(
    client: TestClient,
    project_with_span_annotations_for_bulk_test,
) -> None:
    span_annotation = project_with_span_annotations_for_bulk_test["span_annotation"]
    span_annotation2 = project_with_span_annotations_for_bulk_test["span_annotation2"]

    resp = client.request(
        "DELETE", "/span/bulk/delete", json=[span_annotation.id, span_annotation2.id]
    )

    body = resp.json()
    returned_ids = {item["id"] for item in body}
    assert returned_ids == {span_annotation.id, span_annotation2.id}


def test_delete_span_annotations_bulk_not_exists(client: TestClient) -> None:
    resp = client.request("DELETE", "/span/bulk/delete", json=[999999])

    assert resp.status_code == 404, resp.text


def test_get_by_user_code(
    client: TestClient,
    project_with_span_annotations_for_count_test,
) -> None:
    code = project_with_span_annotations_for_count_test["code"]
    span_annotation = project_with_span_annotations_for_count_test["span_annotation"]
    span_annotation2 = project_with_span_annotations_for_count_test["span_annotation2"]

    resp = client.get(f"/span/code/{code.id}/user")

    assert resp.status_code == 200, resp.text
    items = resp.json()
    assert {i["id"] for i in items} == {span_annotation.id, span_annotation2.id}
    assert all(i["code_id"] == code.id for i in items)


def test_get_by_user_code_if_not_exists(client: TestClient) -> None:
    non_existing_id = 1000

    resp = client.get(f"/span/code/{non_existing_id}/user")

    assert resp.status_code == 403, resp.text


def test_count_span_annotations(
    client: TestClient, project_with_span_annotations_for_count_test, test_user
) -> None:
    sdoc = project_with_span_annotations_for_count_test["source_document"]
    code = project_with_span_annotations_for_count_test["code"]

    payload = {"sdoc_ids": [sdoc.id], "class_ids": [code.id]}
    resp = client.post(f"/span/count_annotations/{test_user.id}", json=payload)

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data.get(str(code.id)) == 2


def test_count_annotation_if_not_exists(client: TestClient) -> None:
    not_existing_id = 2000
    payload = {"sdoc_ids": [not_existing_id], "class_ids": [not_existing_id]}

    resp = client.post(f"/span/count_annotations/{not_existing_id}", json=payload)

    assert resp.status_code == 404, resp.text


def test_add_to_group_ok(
    client: TestClient,
    project_with_span_annotations_and_group,
):
    span_annotation = project_with_span_annotations_and_group["span_annotation"]
    span_group = project_with_span_annotations_and_group["span_group"]
    sdoc = project_with_span_annotations_and_group["source_document"]
    code = project_with_span_annotations_and_group["code"]

    resp = client.patch(f"/span/{span_annotation.id}/group/{span_group.id}")

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["id"] == span_annotation.id
    assert body["sdoc_id"] == sdoc.id
    assert body["code_id"] == code.id


def test_add_to_group_not_found(client: TestClient):
    resp = client.patch("/span/999999/group/888888")

    assert resp.status_code == 403, resp.text


def test_remove_from_group_ok(
    client: TestClient,
    project_with_span_annotations_and_linked_group,
):
    sdoc = project_with_span_annotations_and_linked_group["source_document"]
    code = project_with_span_annotations_and_linked_group["code"]
    span_annotation = project_with_span_annotations_and_linked_group["span_annotation"]
    span_group = project_with_span_annotations_and_linked_group["span_group"]

    resp = client.delete(f"/span/{span_annotation.id}/group/{span_group.id}")

    assert resp.status_code == 200, resp.text
    deleted = SpanAnnotationRead.model_validate(resp.json())
    assert deleted.id == span_annotation.id
    assert deleted.sdoc_id == sdoc.id
    assert deleted.code_id == code.id
    assert deleted.begin == span_annotation.begin
    assert deleted.end == span_annotation.end


def test_remove_from_group_not_exists(client: TestClient):
    resp = client.delete("/span/999999/group/888888")

    assert resp.status_code == 403, resp.text


def test_remove_from_all_groups_ok(
    client: TestClient,
    project_with_span_annotations_and_group,
):
    span_annotation = project_with_span_annotations_and_group["span_annotation"]
    sdoc = project_with_span_annotations_and_group["source_document"]
    code = project_with_span_annotations_and_group["code"]

    resp = client.delete(f"/span/{span_annotation.id}/groups")

    assert resp.status_code == 200, resp.text
    deleted = SpanAnnotationDeleted.model_validate(resp.json())
    assert deleted.id == span_annotation.id
    assert deleted.sdoc_id == sdoc.id
    assert deleted.code_id == code.id
    assert deleted.begin == span_annotation.begin
    assert deleted.end == span_annotation.end


def test_remove_from_all_groups_not_found(client: TestClient):
    resp = client.delete("/span/999999/groups")

    assert resp.status_code == 403, resp.text


def test_get_groups_ok(
    client: TestClient,
    project_with_span_annotations_and_linked_group,
):
    span_annotation = project_with_span_annotations_and_linked_group["span_annotation"]
    span_group = project_with_span_annotations_and_linked_group["span_group"]

    resp = client.get(f"/span/{span_annotation.id}/groups")

    assert resp.status_code == 200, resp.text
    groups = [SpanGroupRead.model_validate(g) for g in resp.json()]
    returned_ids = {g.id for g in groups}
    assert returned_ids == {span_group.id}


def test_get_groups_not_found(client: TestClient):
    resp = client.get("/span/999999/groups")

    assert resp.status_code == 403, resp.text
