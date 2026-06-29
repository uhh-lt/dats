import pytest
from fastapi.testclient import TestClient

from core.memo.memo_dto import (
    AttachedObjectType,
    MemoCreate,
    MemoRead,
    MemoUpdate,
)
from core.user.user_dto import UserRead


def test_add_memo_to_code(client: TestClient, project_with_code, test_user: UserRead):
    code = project_with_code["code"]

    payload = MemoCreate(
        title="First Memo Test",
        content="This is the content of the first test memo.",
        content_json='{"blocks": [{"type": "paragraph", "data": {"text": "This is content."}}]}',
        starred=True,
    )
    response = client.put(
        f"/memo?attached_object_id={code.id}&attached_object_type={AttachedObjectType.code.value}",
        json=payload.model_dump(exclude_none=True),
    )

    assert response.status_code == 200, response.text
    memo = MemoRead.model_validate(response.json())
    assert memo.title == payload.title
    assert memo.user_id == test_user.id
    assert memo.attached_object_id == code.id


def test_add_memo_to_code_attached_not_existing(client: TestClient):
    non_existing_code_id = 99999
    payload = MemoCreate(
        title="Should fail",
        content="No code exists",
        content_json='{"blocks": []}',
        starred=False,
    )

    response = client.put(
        f"/memo?attached_object_id={non_existing_code_id}&attached_object_type={AttachedObjectType.code.value}",
        json=payload.model_dump(exclude_none=True),
    )
    assert response.status_code == 404, response.text


def test_add_memo_to_source_document(
    client: TestClient, project_with_sdoc, test_user: UserRead
):
    sdoc = project_with_sdoc["source_document"]

    payload = MemoCreate(
        title="First Memo Test",
        content="This is the content of the first test memo.",
        content_json='{"blocks": [{"type": "paragraph", "data": {"text": "This is content."}}]}',
        starred=True,
    )
    response = client.put(
        f"/memo?attached_object_id={sdoc.id}"
        f"&attached_object_type={AttachedObjectType.source_document.value}",
        json=payload.model_dump(exclude_none=True),
    )

    assert response.status_code == 200, response.text
    memo = MemoRead.model_validate(response.json())
    assert memo.title == payload.title
    assert memo.user_id == test_user.id
    assert memo.attached_object_id == sdoc.id
    assert memo.attached_object_type == AttachedObjectType.source_document


# add to annotation, add to doc? ...


def test_add_memo_to_sentence_annotation(
    client: TestClient,
    project_with_sentence_annotation,
    test_user: UserRead,
):
    sentence_annotation = project_with_sentence_annotation["sentence_annotation"]

    payload = MemoCreate(
        title="First Memo Test",
        content="This is the content of the first test memo.",
        content_json='{"blocks":[{"type":"paragraph","data":{"text":"This is content."}}]}',
        starred=True,
    )
    resp = client.put(
        f"/memo?attached_object_id={sentence_annotation.id}"
        f"&attached_object_type={AttachedObjectType.sentence_annotation.value}",
        json=payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 200, resp.text
    memo = MemoRead.model_validate(resp.json())
    assert memo.title == payload.title
    assert memo.user_id == test_user.id
    assert memo.attached_object_id == sentence_annotation.id
    assert memo.attached_object_type == AttachedObjectType.sentence_annotation


def test_get_by_id(
    client: TestClient,
    project_with_code_and_memo,
):
    memo = project_with_code_and_memo["memo"]
    code = project_with_code_and_memo["code"]

    response = client.get(f"/memo/{memo.id}")

    assert response.status_code == 200, response.text
    memo_read = MemoRead.model_validate(response.json())
    assert memo_read.id == memo.id
    assert memo_read.title == memo.title
    assert memo_read.content == memo.content
    assert memo_read.starred == memo.starred
    assert memo_read.user_id == memo.user_id
    assert memo_read.attached_object_id == code.id


def test_get_by_id_not_existing(client: TestClient):
    non_existing_memo_id = 99999

    resp = client.get(f"/memo/{non_existing_memo_id}")

    assert resp.status_code == 403, resp.text


testdata_memo = [
    pytest.param({"title": "New Title Only"}, id="title_only"),
    pytest.param({"starred": True}, id="toggle_starred"),
    pytest.param({"content": "New content text"}, id="content_only"),
    pytest.param(
        {"title": "All fields", "content": "Updated!", "starred": True}, id="all_fields"
    ),
]


@pytest.mark.parametrize("payload", testdata_memo)
def test_update_memo_parametrized(
    client: TestClient,
    project_with_code_and_memo,
    payload,
):
    memo = project_with_code_and_memo["memo"]

    response = client.patch(f"/memo/{memo.id}", json=payload)

    assert response.status_code == 200, response.text
    final_memo_state = MemoRead.model_validate(response.json())
    assert final_memo_state.title == payload.get("title", memo.title)
    assert final_memo_state.content == payload.get("content", memo.content)
    assert final_memo_state.starred == payload.get("starred", memo.starred)


test_data_memo_update = [
    pytest.param({"title": "Updated Title"}, id="update_title"),
    pytest.param({"content": "Updated Content"}, id="update_content"),
    pytest.param({"starred": True}, id="update_starred"),
    pytest.param(
        {"title": "All New", "content": "New C", "starred": True},
        id="update_all_fields",
    ),
]


def test_update_by_id_not_existing(
    client: TestClient,
):
    non_existing_memo_id = 999999999
    update_payload = MemoUpdate(
        title="new update",
        content="hallo World",
        starred=True,
    )
    resp = client.patch(
        f"/memo/{non_existing_memo_id}",
        json=update_payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 403, resp.text


def test_delete_by_id(
    client: TestClient,
    project_with_code_and_memo,
):
    memo = project_with_code_and_memo["memo"]

    resp = client.delete(f"/memo/{memo.id}")

    assert resp.status_code == 200, resp.text


def test_delete_by_id_not_existing(client: TestClient):
    non_existing_memo_id = 99999
    resp = client.delete(f"/memo/{non_existing_memo_id}")

    assert resp.status_code == 403, resp.text


def test_get_memos_by_attached_object_id(
    client: TestClient,
    project_with_code_and_multiple_memos,
):
    EXPECTED_COUNT = 3  # as set in the fixture
    attached_object = project_with_code_and_multiple_memos["code"]

    response = client.get(
        f"/memo/attached_obj/{AttachedObjectType.code.value}/to/{attached_object.id}"
    )

    assert response.status_code == 200, response.text
    memos_json = response.json()
    assert len(memos_json) == EXPECTED_COUNT


def test_get_memos_by_attached_object_id_not_existing(
    client: TestClient,
):
    non_existing_code_id = 99999
    resp = client.get(
        f"/memo/attached_obj/{AttachedObjectType.code.value}/to/{non_existing_code_id}"
    )

    assert resp.status_code == 404, resp.text


def test_get_user_memo_by_attached_object_id(
    client: TestClient,
    project_with_code_and_memo,
    test_user: UserRead,
):
    attached_object = project_with_code_and_memo["code"]
    memo = project_with_code_and_memo["memo"]

    response = client.get(
        f"/memo/attached_obj/{AttachedObjectType.code.value}/to/{attached_object.id}/user"
    )

    assert response.status_code == 200, response.text
    memo_read = MemoRead.model_validate(response.json())
    assert memo_read.title == memo.title
    assert memo_read.user_id == test_user.id
    assert memo_read.attached_object_id == attached_object.id
    assert memo_read.attached_object_type == AttachedObjectType.code


def test_get_user_memo_by_attached_object_id_not_existing(
    client: TestClient,
):
    non_existing_code_id = 999999
    resp = client.get(
        f"/memo/attached_obj/{AttachedObjectType.code.value}/to/{non_existing_code_id}/user"
    )
    assert resp.status_code == 404, resp.text
