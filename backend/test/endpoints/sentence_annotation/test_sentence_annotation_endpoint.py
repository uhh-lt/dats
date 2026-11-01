import pytest
from fastapi.testclient import TestClient

from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationCreate,
    SentenceAnnotationRead,
    SentenceAnnotationUpdate,
    SentenceAnnotatorResult,
)
from core.user.user_dto import UserRead
from provenance_test_utils import (
    create_payload,
    get_annotation,
    get_memos,
    get_user_annotation_ids,
)


def test_add_sentence_annotation(client: TestClient, project_with_sdoc_and_code):
    sdoc = project_with_sdoc_and_code["source_document"]
    code = project_with_sdoc_and_code["code"]

    payload = SentenceAnnotationCreate(
        sentence_id_start=1,
        sentence_id_end=2,
        code_id=code.id,
        sdoc_id=sdoc.id,
    )
    response = client.put("/sentence", json=payload.model_dump())

    assert response.status_code == 200, response.text
    sentence = SentenceAnnotationRead.model_validate(response.json())
    assert sentence.sentence_id_start == payload.sentence_id_start
    assert sentence.sentence_id_end == payload.sentence_id_end
    assert sentence.code_id == code.id
    assert sentence.sdoc_id == sdoc.id


def test_add_sentence_annotation_attached_not_existing(
    client: TestClient,
):
    payload = SentenceAnnotationCreate(
        sentence_id_start=0,
        sentence_id_end=0,
        code_id=9999,
        sdoc_id=9999,
    )
    resp = client.put("/sentence", json=payload.model_dump())

    assert resp.status_code == 403, resp.text


def test_add_sentence_annotations_bulk(
    client: TestClient,
    project_with_sdoc_and_code,
):
    sdoc = project_with_sdoc_and_code["source_document"]
    code = project_with_sdoc_and_code["code"]

    payload = [
        SentenceAnnotationCreate(
            sentence_id_start=1, sentence_id_end=2, code_id=code.id, sdoc_id=sdoc.id
        ).model_dump(),
        SentenceAnnotationCreate(
            sentence_id_start=3, sentence_id_end=4, code_id=code.id, sdoc_id=sdoc.id
        ).model_dump(),
    ]
    response = client.put("/sentence/bulk/create", json=payload)

    assert response.status_code == 200, response.text
    items = [SentenceAnnotationRead.model_validate(x) for x in response.json()]
    assert len(items) == 2
    for sent in items:
        assert sent.code_id == code.id
        assert sent.sdoc_id == sdoc.id


def test_add_sentence_annotione_bulk_if_not_exists(
    client: TestClient,
):
    payload = SentenceAnnotationCreate(
        sentence_id_start=0,
        sentence_id_end=0,
        code_id=9999,
        sdoc_id=9999,
    )
    resp = client.put("/sentence/bulk/create", json=[payload.model_dump()])

    assert resp.status_code == 403, resp.text


def test_get_sentence_annotation_endpoint_by_id(
    client: TestClient,
    project_with_sentence_annotation,
):
    sdoc = project_with_sentence_annotation["source_document"]
    code = project_with_sentence_annotation["code"]
    sa = project_with_sentence_annotation["sentence_annotation"]

    resp = client.get(f"/sentence/{sa.id}")

    assert resp.status_code == 200, resp.text
    sentence_read = SentenceAnnotationRead.model_validate(resp.json())
    assert sentence_read.id == sa.id
    assert sentence_read.code_id == code.id
    assert sentence_read.sdoc_id == sdoc.id
    assert sentence_read.sentence_id_start == sa.sentence_id_start
    assert sentence_read.sentence_id_end == sa.sentence_id_end


def test_get_sentence_annotation_by_id_if_not_exists(client: TestClient):
    payload = SentenceAnnotationCreate(
        sentence_id_start=1,
        sentence_id_end=2,
        code_id=9999,
        sdoc_id=9999,
    )
    response = client.get(f"/sentence/{payload.code_id}")
    assert response.status_code == 403, response.text


def test_get_by_sdoc_and_user(
    client: TestClient,
    project_with_sentence_annotation,
    test_user: UserRead,
):
    sdoc = project_with_sentence_annotation["source_document"]
    code = project_with_sentence_annotation["code"]
    sa = project_with_sentence_annotation["sentence_annotation"]

    resp = client.get(f"/sentence/sdoc/{sdoc.id}/user/{test_user.id}")

    assert resp.status_code == 200, resp.text
    data = SentenceAnnotatorResult.model_validate(resp.json())

    # Check that the response contains the expected sentence annotations (1) for the first sentence
    assert len(data.sentence_annotations[0]) == 1
    assert len(data.sentence_annotations[1]) == 0

    # Check that the sentence annotation of the first sentence has the expected properties
    first_annotation = data.sentence_annotations[0][0]
    assert first_annotation.sdoc_id == sdoc.id
    assert first_annotation.code_id == code.id
    assert first_annotation.sentence_id_start == sa.sentence_id_start
    assert first_annotation.sentence_id_end == sa.sentence_id_end


def test_get_by_sdoc_and_user_both_ids_not_exist(
    client: TestClient,
):
    non_existing_sdoc_id = 99999
    non_existing_user_id = 99999
    resp = client.get(
        f"/sentence/sdoc/{non_existing_sdoc_id}/user/{non_existing_user_id}"
    )

    assert resp.status_code == 403, resp.text


def test_update_sentence_annotation_code(
    client: TestClient,
    project_with_sentence_annotation,
):
    sdoc = project_with_sentence_annotation["source_document"]
    code2 = project_with_sentence_annotation["code2"]
    sent_anno = project_with_sentence_annotation["sentence_annotation"]

    payload = {"code_id": code2.id}
    resp = client.patch(f"/sentence/{sent_anno.id}", json=payload)

    assert resp.status_code == 200, resp.text
    updated = SentenceAnnotationRead.model_validate(resp.json())
    assert updated.id == sent_anno.id
    assert updated.sdoc_id == sdoc.id
    assert updated.code_id == payload["code_id"]


def test_update_sentence_annotation_by_id_if_not_exists(client: TestClient):
    non_existing_sentence_anno_id = 9999
    payload = SentenceAnnotationUpdate(code_id=1)
    resp = client.patch(
        f"/sentence/{non_existing_sentence_anno_id}",
        json=payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 403, resp.text


def test_resize_sentence_annotation(
    client: TestClient,
    db_session,
    project_with_sentence_annotation,
) -> None:
    sent_anno = project_with_sentence_annotation["sentence_annotation"]
    payload = {
        "sentence_id_start": 0,
        "sentence_id_end": 1,
    }

    resp = client.patch(f"/sentence/{sent_anno.id}", json=payload)

    assert resp.status_code == 200, resp.text
    updated = SentenceAnnotationRead.model_validate(resp.json())
    assert updated.id == sent_anno.id
    assert updated.sentence_id_start == payload["sentence_id_start"]
    assert updated.sentence_id_end == payload["sentence_id_end"]
    assert updated.code_id == sent_anno.code_id

    db_session.refresh(sent_anno)
    assert sent_anno.sentence_id_start == payload["sentence_id_start"]
    assert sent_anno.sentence_id_end == payload["sentence_id_end"]


def test_resize_sentence_annotation_and_update_code(
    client: TestClient,
    project_with_multiple_sentence_annotations_and_new_code,
) -> None:
    sent_anno = project_with_multiple_sentence_annotations_and_new_code[
        "sentence_annotations"
    ][0]
    new_code = project_with_multiple_sentence_annotations_and_new_code["new_code"]
    payload = {
        "code_id": new_code.id,
        "sentence_id_start": 0,
        "sentence_id_end": 1,
    }

    resp = client.patch(f"/sentence/{sent_anno.id}", json=payload)

    assert resp.status_code == 200, resp.text
    updated = SentenceAnnotationRead.model_validate(resp.json())
    assert updated.id == sent_anno.id
    assert updated.code_id == new_code.id
    assert updated.sentence_id_start == payload["sentence_id_start"]
    assert updated.sentence_id_end == payload["sentence_id_end"]


invalid_resize_payloads = [
    pytest.param({"sentence_id_start": 0}, id="partial_resize_bundle"),
    pytest.param(
        {"sentence_id_start": -1, "sentence_id_end": 1},
        id="negative_sentence_index",
    ),
    pytest.param(
        {"sentence_id_start": 1, "sentence_id_end": 0},
        id="start_larger_than_end",
    ),
    pytest.param(
        {"sentence_id_start": None, "sentence_id_end": 1},
        id="null_resize_field",
    ),
    pytest.param({}, id="empty_update"),
]


@pytest.mark.parametrize("payload", invalid_resize_payloads)
def test_resize_sentence_annotation_rejects_invalid_payload(
    client: TestClient,
    project_with_sentence_annotation,
    payload,
) -> None:
    sent_anno = project_with_sentence_annotation["sentence_annotation"]

    resp = client.patch(f"/sentence/{sent_anno.id}", json=payload)

    assert resp.status_code == 422, resp.text


def test_resize_sentence_annotation_if_not_exists(client: TestClient) -> None:
    non_existing_sentence_anno_id = 9999
    payload = {
        "sentence_id_start": 0,
        "sentence_id_end": 1,
    }

    resp = client.patch(
        f"/sentence/{non_existing_sentence_anno_id}",
        json=payload,
    )

    assert resp.status_code == 403, resp.text


testdata_bulk = [
    pytest.param({"target": "sa1", "code_mode": "new"}, id="update_sa1_new_code"),
    pytest.param({"target": "sa1", "code_mode": "old"}, id="update_sa1_old_code"),
    pytest.param({"target": "sa2", "code_mode": "new"}, id="update_sa2_new_code"),
    pytest.param({"target": "sa2", "code_mode": "old"}, id="update_sa2_old_code"),
]


@pytest.mark.parametrize("params", testdata_bulk)
def test_update_sent_anno_annotations_bulk_parametrized(
    client: TestClient,
    project_with_multiple_sentence_annotations_and_new_code,
    params: dict,
):
    sdoc = project_with_multiple_sentence_annotations_and_new_code["source_document"]
    old_code = project_with_multiple_sentence_annotations_and_new_code["code"]
    new_code = project_with_multiple_sentence_annotations_and_new_code["new_code"]
    [sa1, sa2] = project_with_multiple_sentence_annotations_and_new_code[
        "sentence_annotations"
    ]

    if params["target"] == "sa1":
        original_anno = sa1
    else:
        original_anno = sa2
    target_code_id = new_code.id if params["code_mode"] == "new" else old_code.id
    payload = {"sentence_annotation_id": original_anno.id, "code_id": target_code_id}
    resp = client.patch("/sentence/bulk/update", json=[payload])

    assert resp.status_code == 200, resp.text
    updated = SentenceAnnotationRead.model_validate(resp.json()[0])
    assert updated.id == original_anno.id
    assert updated.sdoc_id == sdoc.id
    assert updated.code_id == payload.get("code_id", original_anno.code_id)
    assert updated.sentence_id_start == payload.get(
        "sentence_id_start", original_anno.sentence_id_start
    )
    assert updated.sentence_id_end == payload.get(
        "sentence_id_end", original_anno.sentence_id_end
    )


def test_update_sent_anno_annotations_bulk_not_exists(
    client: TestClient,
    project_with_multiple_sentence_annotations,
):
    code = project_with_multiple_sentence_annotations["code"]
    sa = project_with_multiple_sentence_annotations["sentence_annotations"][0]

    non_existsing_id = 6666
    payload = [
        {"sentence_annotation_id": sa.id, "code_id": code.id},
        {"sentence_annotation_id": non_existsing_id, "code_id": code.id},
    ]
    resp = client.patch("/sentence/bulk/update", json=payload)

    assert resp.status_code == 403, resp.text


def test_delete_sentence_annotation_by_id(
    client: TestClient,
    project_with_sentence_annotation,
):
    sdoc = project_with_sentence_annotation["source_document"]
    code = project_with_sentence_annotation["code"]
    sa = project_with_sentence_annotation["sentence_annotation"]

    resp = client.delete(f"/sentence/{sa.id}")

    assert resp.status_code == 200, resp.text
    sentence_read = SentenceAnnotationRead.model_validate(resp.json())
    assert sentence_read.id == sa.id
    assert sentence_read.code_id == code.id
    assert sentence_read.sdoc_id == sdoc.id
    assert sentence_read.sentence_id_start == sa.sentence_id_start
    assert sentence_read.sentence_id_end == sa.sentence_id_end


def test_delete_sentence_annotation_by_id_not_exists(client: TestClient):
    resp = client.delete("/sentence/999999")

    assert resp.status_code == 403, resp.text


def delete_bulk_by_id(
    client: TestClient,
    project_with_multiple_sentence_annotations,
):
    annotations = project_with_multiple_sentence_annotations["sentence_annotations"]

    resp = client.request(
        "DELETE", "/sentence/bulk/delete", json=[sa.id for sa in annotations]
    )

    assert resp.status_code == 200, resp.text
    assert len(resp.json()) == len(annotations)


def test_delete_bulk_by_id_if_not_exists(
    client: TestClient,
    project_with_multiple_sentence_annotations,
):
    not_existsing_id = 6666
    sa = project_with_multiple_sentence_annotations["sentence_annotations"][0]

    resp = client.request(
        "DELETE",
        "/sentence/bulk/delete",
        json=[sa.id, not_existsing_id],
    )

    assert resp.status_code == 403, resp.text


def test_get_by_user_code(
    client: TestClient,
    project_with_multiple_sentence_annotations,
):
    code = project_with_multiple_sentence_annotations["code"]
    annotations = project_with_multiple_sentence_annotations["sentence_annotations"]

    resp = client.get(f"/sentence/code/{code.id}/user")

    assert resp.status_code == 200, resp.text
    items = [SentenceAnnotationRead.model_validate(x) for x in resp.json()]
    assert len(items) == len(annotations)
    assert all(x.code_id == code.id for x in items)


def test_get_by_user_code_if_not_exists(
    client: TestClient,
):
    not_existsing_id = 1000
    response = client.get(f"/code/{not_existsing_id}/user")

    assert response.status_code == 404, response.text


def test_count_annotations(
    client: TestClient,
    project_with_multiple_sentence_annotations,
    test_user: UserRead,
):
    sdoc = project_with_multiple_sentence_annotations["source_document"]
    code = project_with_multiple_sentence_annotations["code"]
    annotations = project_with_multiple_sentence_annotations["sentence_annotations"]

    payload = {"sdoc_ids": [sdoc.id], "class_ids": [code.id]}
    resp = client.post(f"/sentence/count_annotations/{test_user.id}", json=payload)

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data.get(str(code.id)) == len(annotations)


def test_count_annotation_if_not_exists(client: TestClient):
    not_existing_id = 2000
    payload = {"sdoc_ids": [not_existing_id], "class_ids": [not_existing_id]}

    resp = client.post(f"/sentence/count_annotations/{not_existing_id}", json=payload)

    assert resp.status_code == 403, resp.text


# ===========================================================================
# CREATE SENTENCE ANNOTATION (/sentence) TESTS: PROVENANCE
# ===========================================================================
# --- A. single copies record their provenance --------------------------------------


def test_create_copy_records_source_annotation_user_and_code(
    client: TestClient, provenance_project
) -> None:
    """A copy stores its source annotation and the source's user and code; it
    belongs to the copying user, with the code the client sent."""
    annotations = provenance_project["sentence"]
    payload = create_payload(
        "sentence",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_b"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )

    response = client.put("/sentence", json=payload)

    assert response.status_code == 200, response.text
    copy = SentenceAnnotationRead.model_validate(response.json())
    assert copy.user_id == provenance_project["user"].id
    assert copy.code_id == provenance_project["code_b"].id
    assert copy.source_annotation_id == annotations["source_id"]
    assert copy.source_user_id == provenance_project["assistant"].id
    assert copy.source_code_id == provenance_project["code_a"].id


def test_create_copy_is_created_after_its_source(
    client: TestClient, provenance_project
) -> None:
    """The copy time is the copy's own `created`, not the source's."""
    annotations = provenance_project["sentence"]
    source = get_annotation(client, "sentence", annotations["source_id"])
    payload = create_payload(
        "sentence",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )

    response = client.put("/sentence", json=payload)

    assert response.status_code == 200, response.text
    copy = SentenceAnnotationRead.model_validate(response.json())
    assert copy.created > source.created


def test_create_copy_copies_memos_of_source_with_their_authors(
    client: TestClient, provenance_project
) -> None:
    """The source's memos are copied onto the copy: new memos with the same title,
    icon and content, still authored by their original authors. The source keeps
    its own memos."""
    annotations = provenance_project["sentence"]
    source_memos = annotations["source_memos"]
    payload = create_payload(
        "sentence",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )

    response = client.put("/sentence", json=payload)

    assert response.status_code == 200, response.text
    copy = SentenceAnnotationRead.model_validate(response.json())
    copied_memos = get_memos(client, "sentence", copy.id)
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
        memo.id for memo in get_memos(client, "sentence", annotations["source_id"])
    } == {memo.id for memo in source_memos}


def test_create_copy_of_source_without_memos_has_no_memos(
    client: TestClient, provenance_project
) -> None:
    """Copying a source without memos records the provenance and creates no memo."""
    annotations = provenance_project["sentence"]
    payload = create_payload(
        "sentence",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=1,
        source_annotation_id=annotations["source_plain_id"],
    )

    response = client.put("/sentence", json=payload)

    assert response.status_code == 200, response.text
    copy = SentenceAnnotationRead.model_validate(response.json())
    assert copy.source_annotation_id == annotations["source_plain_id"]
    assert copy.memo_ids == []


def test_create_own_annotation_has_no_provenance(
    client: TestClient, provenance_project
) -> None:
    """An annotation created without a source has no provenance."""
    annotations = provenance_project["sentence"]
    payload = create_payload(
        "sentence",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=2,
    )

    response = client.put("/sentence", json=payload)

    assert response.status_code == 200, response.text
    annotation = SentenceAnnotationRead.model_validate(response.json())
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
    own_id = project["sentence_copies"]["own_id"]
    payload = create_payload(
        "sentence",
        sdoc_id=project["sentence"]["sdoc_id"],
        code_id=project["code_a"].id,
        position=1,
        source_annotation_id=own_id,
    )

    response = client.put("/sentence", json=payload)

    assert response.status_code == 200, response.text
    copy = SentenceAnnotationRead.model_validate(response.json())
    assert copy.source_annotation_id == own_id
    assert copy.source_user_id == project["user"].id
    assert copy.source_code_id == project["code_b"].id


def test_create_copy_ignores_client_sent_source_user_and_code(
    client: TestClient, provenance_project
) -> None:
    """`source_user_id` and `source_code_id` are not part of the create body: the
    server derives them from the source annotation."""
    annotations = provenance_project["sentence"]
    payload = create_payload(
        "sentence",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )
    payload["source_user_id"] = provenance_project["user"].id
    payload["source_code_id"] = provenance_project["code_b"].id

    response = client.put("/sentence", json=payload)

    assert response.status_code == 200, response.text
    copy = SentenceAnnotationRead.model_validate(response.json())
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
    annotations = provenance_project["sentence"]
    source_id = annotations[source_key]
    payload = create_payload(
        "sentence",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=source_id,
    )

    response = client.put("/sentence", json=payload)

    assert response.status_code == expected_status, response.text
    assert f"Annotation {source_id} cannot be copied" in response.text
    assert (
        get_user_annotation_ids(
            client, "sentence", annotations["sdoc_id"], provenance_project["user"].id
        )
        == set()
    )


def test_create_copy_of_nonexistent_source_is_not_found(
    client: TestClient, provenance_project
) -> None:
    """A single copy of a source that does not exist (e.g. deleted after the
    comparison was opened) is skipped, so the request fails with 404."""
    annotations = provenance_project["sentence"]
    payload = create_payload(
        "sentence",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=999_999,
    )

    response = client.put("/sentence", json=payload)

    assert response.status_code == 404, response.text
    assert (
        get_user_annotation_ids(
            client, "sentence", annotations["sdoc_id"], provenance_project["user"].id
        )
        == set()
    )


# ===========================================================================
# BULK CREATE SENTENCE ANNOTATIONS (/sentence/bulk/create) TESTS: PROVENANCE
# ===========================================================================
def test_create_bulk_records_provenance_of_every_copy(
    client: TestClient, provenance_project
) -> None:
    """ "Apply all": a bulk create of two copies and one own annotation records the
    provenance of both copies, in the order of the request, and copies only the
    memos of the source that has memos."""
    annotations = provenance_project["sentence"]
    code_a_id = provenance_project["code_a"].id
    payload = [
        create_payload(
            "sentence",
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=0,
            source_annotation_id=annotations["source_id"],
        ),
        create_payload(
            "sentence",
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=1,
            source_annotation_id=annotations["source_plain_id"],
        ),
        create_payload(
            "sentence", sdoc_id=annotations["sdoc_id"], code_id=code_a_id, position=2
        ),
    ]

    response = client.put("/sentence/bulk/create", json=payload)

    assert response.status_code == 200, response.text
    results = [SentenceAnnotationRead.model_validate(item) for item in response.json()]
    assert [result.source_annotation_id for result in results] == [
        annotations["source_id"],
        annotations["source_plain_id"],
        None,
    ]
    assert [result.source_user_id for result in results] == [
        provenance_project["assistant"].id,
        provenance_project["assistant"].id,
        None,
    ]
    assert [result.source_code_id for result in results] == [code_a_id, code_a_id, None]
    assert [len(result.memo_ids) for result in results] == [2, 0, 0]


def test_create_bulk_copies_of_same_source_each_get_memo_copies(
    client: TestClient, provenance_project
) -> None:
    """Copying the same source twice in one batch gives each copy its own memo
    copies."""
    annotations = provenance_project["sentence"]
    payload = [
        create_payload(
            "sentence",
            sdoc_id=annotations["sdoc_id"],
            code_id=code_id,
            position=0,
            source_annotation_id=annotations["source_id"],
        )
        for code_id in [
            provenance_project["code_a"].id,
            provenance_project["code_b"].id,
        ]
    ]

    response = client.put("/sentence/bulk/create", json=payload)

    assert response.status_code == 200, response.text
    results = [SentenceAnnotationRead.model_validate(item) for item in response.json()]
    assert [len(result.memo_ids) for result in results] == [2, 2]
    assert not set(results[0].memo_ids) & set(results[1].memo_ids)


def test_create_bulk_skips_copies_of_nonexistent_sources(
    client: TestClient, provenance_project
) -> None:
    """ "Apply all" on a stale comparison: a copy whose source was deleted in the
    meantime is skipped silently, the other copy and the own annotation of the batch
    are still created."""
    annotations = provenance_project["sentence"]
    code_a_id = provenance_project["code_a"].id
    payload = [
        create_payload(
            "sentence",
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=0,
            source_annotation_id=999_999,
        ),
        create_payload(
            "sentence",
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=1,
            source_annotation_id=annotations["source_id"],
        ),
        create_payload(
            "sentence", sdoc_id=annotations["sdoc_id"], code_id=code_a_id, position=0
        ),
    ]

    response = client.put("/sentence/bulk/create", json=payload)

    assert response.status_code == 200, response.text
    results = [SentenceAnnotationRead.model_validate(item) for item in response.json()]
    assert [result.source_annotation_id for result in results] == [
        annotations["source_id"],
        None,
    ]
    assert get_user_annotation_ids(
        client, "sentence", annotations["sdoc_id"], provenance_project["user"].id
    ) == {result.id for result in results}


def test_create_bulk_with_one_invalid_source_creates_nothing(
    client: TestClient, provenance_project
) -> None:
    """One source from another document rejects the whole batch."""
    annotations = provenance_project["sentence"]
    code_a_id = provenance_project["code_a"].id
    payload = [
        create_payload(
            "sentence",
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=0,
            source_annotation_id=annotations["source_id"],
        ),
        create_payload(
            "sentence",
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=1,
            source_annotation_id=annotations["other_sdoc_source_id"],
        ),
    ]

    response = client.put("/sentence/bulk/create", json=payload)

    assert response.status_code == 400, response.text
    assert (
        get_user_annotation_ids(
            client, "sentence", annotations["sdoc_id"], provenance_project["user"].id
        )
        == set()
    )


# ===========================================================================
# DELETE SENTENCE ANNOTATION (/sentence/{sentence_anno_id}) TESTS: PROVENANCE
# ===========================================================================
# The provenance columns are ON DELETE SET NULL: deleting the source annotation, its
# user or its code clears only that column of the copy and keeps the rest.


def test_delete_source_annotation_keeps_source_user_and_code_of_copy(
    client: TestClient, provenance_project_with_copies
) -> None:
    """Deleting the source annotation clears the copy's `source_annotation_id`; the
    snapshot of its user and code stays."""
    project = provenance_project_with_copies
    copy_id = project["sentence_copies"]["copy_id"]

    response = client.delete(f"/sentence/{project['sentence']['source_id']}")

    assert response.status_code == 200, response.text
    copy = get_annotation(client, "sentence", copy_id)
    assert copy.source_annotation_id is None
    assert copy.source_user_id == project["assistant"].id
    assert copy.source_code_id == project["code_a"].id
