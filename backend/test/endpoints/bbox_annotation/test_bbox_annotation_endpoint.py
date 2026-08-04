import pytest
from fastapi.testclient import TestClient

from core.annotation.bbox_annotation_dto import (
    BBoxAnnotationRead,
    BBoxAnnotationUpdate,
)


def test_update_bbox_annotation_code(
    client: TestClient,
    project_with_bbox_annotation,
):
    bbox_anno = project_with_bbox_annotation["bbox_annotation"]

    payload = {
        "code_id": bbox_anno.code_id - 1
    }  # This should be a valid SYSTEM code_id that already exist in the DB
    resp = client.patch(f"/bbox/{bbox_anno.id}", json=payload)

    assert resp.status_code == 200, resp.text
    updated = BBoxAnnotationRead.model_validate(resp.json())
    assert updated.id == bbox_anno.id
    assert updated.code_id == payload["code_id"]
    assert updated.x_min == bbox_anno.x_min
    assert updated.x_max == bbox_anno.x_max
    assert updated.y_min == bbox_anno.y_min
    assert updated.y_max == bbox_anno.y_max


def test_update_bbox_annotation_by_id_if_not_exists(client: TestClient):
    non_existing_bbox_anno_id = 9999
    payload = BBoxAnnotationUpdate(code_id=1)
    resp = client.patch(
        f"/bbox/{non_existing_bbox_anno_id}",
        json=payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 403, resp.text


def test_resize_bbox_annotation(
    client: TestClient,
    db_session,
    project_with_bbox_annotation,
) -> None:
    bbox_anno = project_with_bbox_annotation["bbox_annotation"]
    payload = {
        "x_min": 10,
        "x_max": 50,
        "y_min": 20,
        "y_max": 60,
    }

    resp = client.patch(f"/bbox/{bbox_anno.id}", json=payload)

    assert resp.status_code == 200, resp.text
    updated = BBoxAnnotationRead.model_validate(resp.json())
    assert updated.id == bbox_anno.id
    assert updated.x_min == payload["x_min"]
    assert updated.x_max == payload["x_max"]
    assert updated.y_min == payload["y_min"]
    assert updated.y_max == payload["y_max"]
    assert updated.code_id == bbox_anno.code_id

    db_session.refresh(bbox_anno)
    assert bbox_anno.x_min == payload["x_min"]
    assert bbox_anno.x_max == payload["x_max"]
    assert bbox_anno.y_min == payload["y_min"]
    assert bbox_anno.y_max == payload["y_max"]


def test_resize_bbox_annotation_and_update_code(
    client: TestClient,
    project_with_bbox_annotation,
) -> None:
    bbox_anno = project_with_bbox_annotation["bbox_annotation"]
    payload = {
        "code_id": bbox_anno.code_id - 1,  # valid SYSTEM code_id
        "x_min": 10,
        "x_max": 50,
        "y_min": 20,
        "y_max": 60,
    }

    resp = client.patch(f"/bbox/{bbox_anno.id}", json=payload)

    assert resp.status_code == 200, resp.text
    updated = BBoxAnnotationRead.model_validate(resp.json())
    assert updated.id == bbox_anno.id
    assert updated.code_id == payload["code_id"]
    assert updated.x_min == payload["x_min"]
    assert updated.x_max == payload["x_max"]
    assert updated.y_min == payload["y_min"]
    assert updated.y_max == payload["y_max"]


invalid_resize_payloads = [
    pytest.param({"x_min": 10}, id="partial_resize_bundle"),
    pytest.param(
        {"x_min": -1, "x_max": 50, "y_min": 20, "y_max": 60},
        id="negative_coordinate",
    ),
    pytest.param(
        {"x_min": 50, "x_max": 10, "y_min": 20, "y_max": 60},
        id="x_min_larger_than_x_max",
    ),
    pytest.param(
        {"x_min": 10, "x_max": 50, "y_min": 60, "y_max": 20},
        id="y_min_larger_than_y_max",
    ),
    pytest.param(
        {"x_min": None, "x_max": 50, "y_min": 20, "y_max": 60},
        id="null_resize_field",
    ),
    pytest.param({}, id="empty_update"),
]


@pytest.mark.parametrize("payload", invalid_resize_payloads)
def test_resize_bbox_annotation_rejects_invalid_payload(
    client: TestClient,
    project_with_bbox_annotation,
    payload,
) -> None:
    bbox_anno = project_with_bbox_annotation["bbox_annotation"]

    resp = client.patch(f"/bbox/{bbox_anno.id}", json=payload)

    assert resp.status_code == 422, resp.text


def test_resize_bbox_annotation_if_not_exists(client: TestClient) -> None:
    non_existing_bbox_anno_id = 9999
    payload = {
        "x_min": 10,
        "x_max": 50,
        "y_min": 20,
        "y_max": 60,
    }

    resp = client.patch(
        f"/bbox/{non_existing_bbox_anno_id}",
        json=payload,
    )

    assert resp.status_code == 403, resp.text
