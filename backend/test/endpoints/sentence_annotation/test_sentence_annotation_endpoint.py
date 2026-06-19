import pytest
from fastapi.testclient import TestClient

from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationCreate,
    SentenceAnnotationRead,
    SentenceAnnotationUpdate,
)
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.user.user_dto import UserRead


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

    assert response.status_code == 200
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

    assert resp.status_code == 403


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

    assert response.status_code == 200
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
    resp = client.put("/sentence/bulk/create/", json=[payload.model_dump()])

    assert resp.status_code == 403


def test_get_sentence_annotation_endpoint_by_id(
    client: TestClient,
    project_with_sentence_annotation,
):
    sdoc = project_with_sentence_annotation["source_document"]
    code = project_with_sentence_annotation["code"]
    sa = project_with_sentence_annotation["sentence_annotation"]

    resp = client.get(f"/sentence/{sa.id}")

    assert resp.status_code == 200
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
    assert response.status_code == 403


def test_get_by_sdoc_and_user(
    client: TestClient,
    project_with_sentence_annotation,
    test_user: UserRead,
):
    sdoc = project_with_sentence_annotation["source_document"]
    code = project_with_sentence_annotation["code"]
    sa = project_with_sentence_annotation["sentence_annotation"]

    resp = client.get(f"/sentence/sdoc/{sdoc.id}/user/{test_user.id}")

    assert resp.status_code == 200
    data = resp.json()["sentence_annotations"]
    assert len(data) == 1
    first = data["0"][0]
    assert first["sdoc_id"] == sdoc.id
    assert first["code_id"] == code.id
    assert first["sentence_id_start"] == sa.sentence_id_start
    assert first["sentence_id_end"] == sa.sentence_id_end


def test_get_by_sdoc_and_user_both_ids_not_exist(
    client: TestClient,
):
    non_existing_sdoc_id = 99999
    non_existing_user_id = 99999
    resp = client.get(
        f"/sentence/sdoc/{non_existing_sdoc_id}/user/{non_existing_user_id}"
    )

    assert resp.status_code == 403


testdata_sentence_annotation_update = [
    pytest.param({"code_id": 137}, id="update_code_only"),
    pytest.param({"sentence_id_start": 1, "code_id": 136}, id="update_start"),
    pytest.param({"sentence_id_end": 2, "code_id": 136}, id="update_end"),
    pytest.param(
        {"sentence_id_start": 1, "sentence_id_end": 2, "code_id": 136},
        id="both_start_end",
    ),
]


@pytest.mark.parametrize("payload", testdata_sentence_annotation_update)
def test_update_sentence_annotation_parametrized(
    client: TestClient,
    project_with_sentence_annotation,
    payload: dict,
):
    sdoc = project_with_sentence_annotation["source_document"]
    code = project_with_sentence_annotation["code"]
    sent_anno = project_with_sentence_annotation["sentence_annotation"]

    resp = client.patch(f"/sentence/{sent_anno.id}", json=payload)

    assert resp.status_code == 200
    updated = SentenceAnnotationRead.model_validate(resp.json())
    assert updated.id == sent_anno.id
    assert updated.sdoc_id == sdoc.id
    assert updated.code_id == payload.get("code_id", code.id)
    assert updated.sentence_id_start == payload.get(
        "sentence_id_start", sent_anno.sentence_id_start
    )
    assert updated.sentence_id_end == payload.get(
        "sentence_id_end", sent_anno.sentence_id_end
    )


def test_update_sentence_annotation_by_id_if_not_exists(client: TestClient):
    non_existing_sentence_anno_id = 9999
    payload = SentenceAnnotationUpdate(code_id=1)
    resp = client.patch(
        f"/sentence/{non_existing_sentence_anno_id}",
        json=payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 403


testdata_bulk = [
    pytest.param({"target": "sa1", "code_mode": "new"}, id="update_sa1_new_code"),
    pytest.param({"target": "sa2", "code_mode": "old"}, id="update_sa2_old_code"),
]


@pytest.mark.parametrize("params", testdata_bulk)
def test_update_sent_anno_annotations_bulk_parametrized(
    client: TestClient,
    db_session,
    project_with_multiple_sentence_annotations,
    params: dict,
):
    sdoc = project_with_multiple_sentence_annotations["source_document"]
    old_code = project_with_multiple_sentence_annotations["code"]
    new_code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="New Code Test",
            color="red",
            project_id=sdoc.project_id,
            is_system=False,
        ),
    )
    sa1 = project_with_multiple_sentence_annotations["sentence_annotation"]
    sa2 = project_with_multiple_sentence_annotations["sentence_annotation"]

    if params["target"] == "sa1":
        original_anno = sa1
    else:
        original_anno = sa2
    target_code_id = new_code.id if params["code_mode"] == "new" else old_code.id
    payload = {"sent_annotation_id": original_anno.id, "code_id": target_code_id}
    resp = client.patch("/sentence/bulk/update", json=[payload])

    assert resp.status_code == 200, f"Error: {resp.text}"
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
        {"sent_annotation_id": sa.id, "code_id": code.id},
        {"sent_annotation_id": non_existsing_id, "code_id": code.id},
    ]
    resp = client.patch("/sentence/bulk/update", json=payload)

    assert resp.status_code == 403


def test_delete_sentence_annotation_by_id(
    client: TestClient,
    project_with_sentence_annotation,
):
    sdoc = project_with_sentence_annotation["source_document"]
    code = project_with_sentence_annotation["code"]
    sa = project_with_sentence_annotation["sentence_annotation"]

    resp = client.delete(f"/sentence/{sa.id}")

    assert resp.status_code == 200
    sentence_read = SentenceAnnotationRead.model_validate(resp.json())
    assert sentence_read.id == sa.id
    assert sentence_read.code_id == code.id
    assert sentence_read.sdoc_id == sdoc.id
    assert sentence_read.sentence_id_start == sa.sentence_id_start
    assert sentence_read.sentence_id_end == sa.sentence_id_end


def test_delete_sentence_annotation_by_id_not_exists(client: TestClient):
    resp = client.delete("/sentence/999999")

    assert resp.status_code == 403


def delete_bulk_by_id(
    client: TestClient,
    project_with_multiple_sentence_annotations,
):
    annotations = project_with_multiple_sentence_annotations["sentence_annotations"]

    resp = client.request(
        "DELETE", "/sentence/bulk/delete", json=[sa.id for sa in annotations]
    )

    assert resp.status_code == 200
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

    assert resp.status_code == 404


def test_get_by_user_code(
    client: TestClient,
    project_with_multiple_sentence_annotations,
):
    code = project_with_multiple_sentence_annotations["code"]
    annotations = project_with_multiple_sentence_annotations["sentence_annotations"]

    resp = client.get(f"/sentence/code/{code.id}/user")

    assert resp.status_code == 200
    items = [SentenceAnnotationRead.model_validate(x) for x in resp.json()]
    assert len(items) == len(annotations)
    assert all(x.code_id == code.id for x in items)


def test_get_by_user_code_if_not_exists(
    client: TestClient,
):
    not_existsing_id = 1000
    response = client.get(f"/code/{not_existsing_id}/user")

    assert response.status_code == 404


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

    assert resp.status_code == 200
    data = resp.json()
    assert data.get(str(code.id)) == len(annotations)


def test_count_annotation_if_not_exists(client: TestClient):
    not_existing_id = 2000
    payload = {"sdoc_ids": [not_existing_id], "class_ids": [not_existing_id]}

    resp = client.post(f"/sentence/count_annotations/{not_existing_id}", json=payload)

    assert resp.status_code == 404
