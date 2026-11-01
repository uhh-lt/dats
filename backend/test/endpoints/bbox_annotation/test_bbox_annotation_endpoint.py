import pytest
from fastapi.testclient import TestClient

from core.annotation.bbox_annotation_dto import (
    BBoxAnnotationRead,
    BBoxAnnotationUpdate,
)
from provenance_test_utils import (
    create_payload,
    get_annotation,
    get_memos,
    get_user_annotation_ids,
)


def test_update_bbox_annotation_code(
    client: TestClient,
    project_with_bbox_annotation,
):
    bbox_anno = project_with_bbox_annotation["bbox_annotation"]
    code2 = project_with_bbox_annotation["code2"]

    payload = {"code_id": code2.id}
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
    code2 = project_with_bbox_annotation["code2"]
    payload = {
        "code_id": code2.id,
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


# ===========================================================================
# CREATE BBOX ANNOTATION (/bbox) TESTS: PROVENANCE
# ===========================================================================
# --- A. single copies record their provenance --------------------------------------


def test_create_copy_records_source_annotation_user_and_code(
    client: TestClient, provenance_project
) -> None:
    """A copy stores its source annotation and the source's user and code; it
    belongs to the copying user, with the code the client sent."""
    annotations = provenance_project["bbox"]
    payload = create_payload(
        "bbox",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_b"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )

    response = client.put("/bbox", json=payload)

    assert response.status_code == 200, response.text
    copy = BBoxAnnotationRead.model_validate(response.json())
    assert copy.user_id == provenance_project["user"].id
    assert copy.code_id == provenance_project["code_b"].id
    assert copy.source_annotation_id == annotations["source_id"]
    assert copy.source_user_id == provenance_project["assistant"].id
    assert copy.source_code_id == provenance_project["code_a"].id


def test_create_copy_is_created_after_its_source(
    client: TestClient, provenance_project
) -> None:
    """The copy time is the copy's own `created`, not the source's."""
    annotations = provenance_project["bbox"]
    source = get_annotation(client, "bbox", annotations["source_id"])
    payload = create_payload(
        "bbox",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )

    response = client.put("/bbox", json=payload)

    assert response.status_code == 200, response.text
    copy = BBoxAnnotationRead.model_validate(response.json())
    assert copy.created > source.created


def test_create_copy_copies_memos_of_source_with_their_authors(
    client: TestClient, provenance_project
) -> None:
    """The source's memos are copied onto the copy: new memos with the same title,
    icon and content, still authored by their original authors. The source keeps
    its own memos."""
    annotations = provenance_project["bbox"]
    source_memos = annotations["source_memos"]
    payload = create_payload(
        "bbox",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )

    response = client.put("/bbox", json=payload)

    assert response.status_code == 200, response.text
    copy = BBoxAnnotationRead.model_validate(response.json())
    copied_memos = get_memos(client, "bbox", copy.id)
    assert sorted(copy.memo_ids) == sorted(memo.id for memo in copied_memos)
    assert {
        (memo.title, memo.icon, memo.content, memo.content_json, memo.user_id)
        for memo in copied_memos
    } == {
        (memo.title, memo.icon, memo.content, memo.content_json, memo.user_id)
        for memo in source_memos
    }
    assert not {memo.id for memo in copied_memos} & {memo.id for memo in source_memos}
    assert all(memo.attached_object_id == copy.id for memo in copied_memos)
    assert {
        memo.id for memo in get_memos(client, "bbox", annotations["source_id"])
    } == {memo.id for memo in source_memos}


def test_create_copy_of_source_without_memos_has_no_memos(
    client: TestClient, provenance_project
) -> None:
    """Copying a source without memos records the provenance and creates no memo."""
    annotations = provenance_project["bbox"]
    payload = create_payload(
        "bbox",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=1,
        source_annotation_id=annotations["source_plain_id"],
    )

    response = client.put("/bbox", json=payload)

    assert response.status_code == 200, response.text
    copy = BBoxAnnotationRead.model_validate(response.json())
    assert copy.source_annotation_id == annotations["source_plain_id"]
    assert copy.memo_ids == []


def test_create_own_annotation_has_no_provenance(
    client: TestClient, provenance_project
) -> None:
    """An annotation created without a source has no provenance."""
    annotations = provenance_project["bbox"]
    payload = create_payload(
        "bbox",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=2,
    )

    response = client.put("/bbox", json=payload)

    assert response.status_code == 200, response.text
    annotation = BBoxAnnotationRead.model_validate(response.json())
    assert annotation.source_annotation_id is None
    assert annotation.source_user_id is None
    assert annotation.source_code_id is None
    assert annotation.memo_ids == []


def test_create_copy_of_own_annotation_is_recorded(
    client: TestClient, provenance_project_with_copies
) -> None:
    """Copying one's own annotation (e.g. of an earlier run) records the provenance
    like any other source."""
    project = provenance_project_with_copies
    own_id = project["bbox_copies"]["own_id"]
    payload = create_payload(
        "bbox",
        sdoc_id=project["bbox"]["sdoc_id"],
        code_id=project["code_a"].id,
        position=1,
        source_annotation_id=own_id,
    )

    response = client.put("/bbox", json=payload)

    assert response.status_code == 200, response.text
    copy = BBoxAnnotationRead.model_validate(response.json())
    assert copy.source_annotation_id == own_id
    assert copy.source_user_id == project["user"].id
    assert copy.source_code_id == project["code_b"].id


def test_create_copy_ignores_client_sent_source_user_and_code(
    client: TestClient, provenance_project
) -> None:
    """`source_user_id` and `source_code_id` are not part of the create body: the
    server derives them from the source annotation."""
    annotations = provenance_project["bbox"]
    payload = create_payload(
        "bbox",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )
    payload["source_user_id"] = provenance_project["user"].id
    payload["source_code_id"] = provenance_project["code_b"].id

    response = client.put("/bbox", json=payload)

    assert response.status_code == 200, response.text
    copy = BBoxAnnotationRead.model_validate(response.json())
    assert copy.source_user_id == provenance_project["assistant"].id
    assert copy.source_code_id == provenance_project["code_a"].id


# --- B. invalid sources ---------------------------------------------------------------
# A source must annotate the same document of the same project (HTTP 400); a single
# copy of a source that does not exist is not found (HTTP 404), because nothing is
# left to create. Nothing is created in either case.


@pytest.mark.parametrize(
    "source_key,expected_status",
    [
        # the source annotates another document of the same project
        pytest.param("other_sdoc_source_id", 400, id="other-document"),
        # the source belongs to another project of the same user
        pytest.param("other_project_source_id", 400, id="other-project"),
    ],
)
def test_create_copy_of_invalid_source_is_rejected(
    client: TestClient,
    provenance_project,
    source_key: str,
    expected_status: int,
) -> None:
    """A copy of a source from another document or project is rejected."""
    annotations = provenance_project["bbox"]
    source_id = annotations[source_key]
    payload = create_payload(
        "bbox",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=source_id,
    )

    response = client.put("/bbox", json=payload)

    assert response.status_code == expected_status, response.text
    assert f"Annotation {source_id} cannot be copied" in response.text
    assert (
        get_user_annotation_ids(
            client, "bbox", annotations["sdoc_id"], provenance_project["user"].id
        )
        == set()
    )


def test_create_copy_of_nonexistent_source_is_not_found(
    client: TestClient, provenance_project
) -> None:
    """A single copy of a source that does not exist (e.g. deleted after the
    comparison was opened) is skipped, so the request fails with 404."""
    annotations = provenance_project["bbox"]
    payload = create_payload(
        "bbox",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=999_999,
    )

    response = client.put("/bbox", json=payload)

    assert response.status_code == 404, response.text
    assert (
        get_user_annotation_ids(
            client, "bbox", annotations["sdoc_id"], provenance_project["user"].id
        )
        == set()
    )


# ===========================================================================
# DELETE BBOX ANNOTATION (/bbox/{bbox_id}) TESTS: PROVENANCE
# ===========================================================================
# The provenance columns are ON DELETE SET NULL: deleting the source annotation, its
# user or its code clears only that column of the copy and keeps the rest.


def test_delete_source_annotation_keeps_source_user_and_code_of_copy(
    client: TestClient, provenance_project_with_copies
) -> None:
    """Deleting the source annotation clears the copy's `source_annotation_id`; the
    snapshot of its user and code stays."""
    project = provenance_project_with_copies
    copy_id = project["bbox_copies"]["copy_id"]

    response = client.delete(f"/bbox/{project['bbox']['source_id']}")

    assert response.status_code == 200, response.text
    copy = get_annotation(client, "bbox", copy_id)
    assert copy.source_annotation_id is None
    assert copy.source_user_id == project["assistant"].id
    assert copy.source_code_id == project["code_a"].id
