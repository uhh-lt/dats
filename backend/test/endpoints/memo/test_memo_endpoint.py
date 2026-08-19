import pytest
from fastapi.testclient import TestClient

from core.memo.memo_dto import (
    AttachedObjectType,
    MemoCreate,
    MemoRead,
)
from core.memo.memo_orm import MemoORM

from .conftest import MemoProjectState

# Titles of the memos attached to the `code` object in the memo_project fixture.
CODE_MEMO_TITLES = {"Code Memo A", "Code Memo B", "Other Code Memo"}

# Every non-deprecated AttachedObjectType -> the fixture key of an object of that
# type. Create and list tests parametrize over this so no entity type is hardcoded.
# (AttachedObjectType.span_group is deprecated and intentionally not covered.)
ATTACHABLE = {
    AttachedObjectType.code: "code",
    AttachedObjectType.source_document: "sdoc",
    AttachedObjectType.span_annotation: "span_annotation",
    AttachedObjectType.sentence_annotation: "sentence_annotation",
    AttachedObjectType.bbox_annotation: "bbox_annotation",
    AttachedObjectType.project: "project",
    AttachedObjectType.tag: "tag",
}

# AttachedObjectType -> the title of the memo attached to that object in the fixture.
MEMO_TITLE_BY_TYPE = {
    AttachedObjectType.code: "Code Memo A",
    AttachedObjectType.source_document: "Document Memo",
    AttachedObjectType.span_annotation: "Span Memo",
    AttachedObjectType.sentence_annotation: "Sentence Memo",
    AttachedObjectType.bbox_annotation: "BBox Memo",
    AttachedObjectType.project: "Project Memo",
    AttachedObjectType.tag: "Tag Memo",
}


def _create_payload(title: str, content: str = "Some content") -> dict:
    """Build a JSON create payload for a memo via the real MemoCreate DTO."""
    return MemoCreate(
        title=title,
        content=content,
        content_json='{"blocks": []}',
    ).model_dump(mode="json")


# ===========================================================================
# ADD MEMO (PUT /memo) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "object_type",
    list(ATTACHABLE),
    ids=lambda t: t.value,
)
def test_add_memo_to_attached_object(
    client: TestClient,
    memo_project: MemoProjectState,
    object_type: AttachedObjectType,
):
    """Creating a memo attaches it to the given object and to the requesting user.

    Parametrized over every non-deprecated AttachedObjectType.
    """
    attached_object = memo_project[ATTACHABLE[object_type]]
    user = memo_project["user"]

    response = client.put(
        "/memo",
        params={
            "attached_object_id": attached_object.id,
            "attached_object_type": object_type.value,
        },
        json=_create_payload("New Memo"),
    )

    assert response.status_code == 200, response.text
    memo = MemoRead.model_validate(response.json())
    assert memo.title == "New Memo"
    assert memo.user_id == user.id
    assert memo.attached_object_id == attached_object.id
    assert memo.attached_object_type == object_type
    # A freshly created memo is not favorited by anyone.
    assert memo.is_favorite is False


def test_add_memo_allows_multiple_memos_per_user_per_object(
    client: TestClient, memo_project: MemoProjectState
):
    """A user may add another memo to an object that already has one of theirs.

    The old "one memo per user per object" rule is gone: `code` already carries
    two memos by `user`, and adding a third must succeed.
    """
    code = memo_project["code"]

    response = client.put(
        "/memo",
        params={
            "attached_object_id": code.id,
            "attached_object_type": AttachedObjectType.code.value,
        },
        json=_create_payload("Third User Memo"),
    )

    assert response.status_code == 200, response.text
    memo = MemoRead.model_validate(response.json())
    assert memo.user_id == memo_project["user"].id
    assert memo.attached_object_id == code.id


def test_add_memo_to_nonexistent_object_returns_404(client: TestClient):
    """The attached object is resolved first, so an unknown id yields 404."""
    response = client.put(
        "/memo",
        params={
            "attached_object_id": 99999,
            "attached_object_type": AttachedObjectType.code.value,
        },
        json=_create_payload("Should fail"),
    )
    assert response.status_code == 404, response.text


# ===========================================================================
# GET MEMO (GET /memo/{memo_id}) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "object_type",
    list(ATTACHABLE),
    ids=lambda t: t.value,
)
def test_get_memo_by_id(
    client: TestClient, memo_project: MemoProjectState, object_type: AttachedObjectType
):
    """Reading a memo returns its fields and correct attached-object identity.

    Parametrized over every non-deprecated AttachedObjectType: the memo attached
    to each object must resolve back to that object's id and type.
    """
    attached_object = memo_project[ATTACHABLE[object_type]]
    expected_title = MEMO_TITLE_BY_TYPE[object_type]

    # Find the fixture memo with the expected title on this object.
    memo = next(
        m
        for key, m in memo_project.items()
        if isinstance(m, MemoORM) and m.title == expected_title
    )

    response = client.get(f"/memo/{memo.id}")

    assert response.status_code == 200, response.text
    memo_read = MemoRead.model_validate(response.json())
    assert memo_read.id == memo.id
    assert memo_read.title == expected_title
    assert memo_read.content == memo.content
    assert memo_read.user_id == memo.user_id
    assert memo_read.attached_object_id == attached_object.id
    assert memo_read.attached_object_type == object_type


def test_get_memo_is_favorite_is_per_requesting_user(
    client: TestClient, memo_project: MemoProjectState
):
    """`is_favorite` reflects the requesting user, not a global flag.

    The client authenticates as `user`, who favorited `code_memo_a` but not
    `code_memo_b` (only `other_user` favorited B). So A reads as favorited and
    B does not, even though B IS favorited — by someone else.
    """
    fav = client.get(f"/memo/{memo_project['code_memo_a'].id}")
    not_fav = client.get(f"/memo/{memo_project['code_memo_b'].id}")

    assert fav.status_code == 200, fav.text
    assert not_fav.status_code == 200, not_fav.text
    assert MemoRead.model_validate(fav.json()).is_favorite is True
    assert MemoRead.model_validate(not_fav.json()).is_favorite is False


def test_get_memo_by_id_not_existing(client: TestClient):
    """Authorization runs before the existence check, so an unknown id -> 403."""
    response = client.get("/memo/99999")
    assert response.status_code == 403, response.text


# ===========================================================================
# LIST MEMOS BY ATTACHED OBJECT (GET /memo/attached_obj/{type}/to/{id}) TESTS
# ===========================================================================

# Expected memo titles per attachable object (most have exactly one; code has three).
EXPECTED_TITLES_BY_TYPE = {
    AttachedObjectType.code: CODE_MEMO_TITLES,
    AttachedObjectType.source_document: {"Document Memo"},
    AttachedObjectType.span_annotation: {"Span Memo"},
    AttachedObjectType.sentence_annotation: {"Sentence Memo"},
    AttachedObjectType.bbox_annotation: {"BBox Memo"},
    AttachedObjectType.project: {"Project Memo"},
    AttachedObjectType.tag: {"Tag Memo"},
}


@pytest.mark.parametrize(
    "object_type",
    list(ATTACHABLE),
    ids=lambda t: t.value,
)
def test_get_memos_by_attached_object_returns_all_object_memos(
    client: TestClient, memo_project: MemoProjectState, object_type: AttachedObjectType
):
    """Listing an object's memos returns every memo attached to it, all users.

    Parametrized over every non-deprecated AttachedObjectType.
    """
    attached_object = memo_project[ATTACHABLE[object_type]]

    response = client.get(
        f"/memo/attached_obj/{object_type.value}/to/{attached_object.id}"
    )

    assert response.status_code == 200, response.text
    memos = [MemoRead.model_validate(m) for m in response.json()]
    assert {m.title for m in memos} == EXPECTED_TITLES_BY_TYPE[object_type]
    # Every returned memo points back at the requested object.
    for m in memos:
        assert m.attached_object_id == attached_object.id
        assert m.attached_object_type == object_type


def test_get_memos_by_attached_object_marks_requesting_user_favorites(
    client: TestClient, memo_project: MemoProjectState
):
    """In a list, `is_favorite` is still per requesting user.

    `user` favorited only "Code Memo A"; "Code Memo B" is favorited solely by
    `other_user`, so it must NOT be flagged for the requesting `user`.
    """
    code = memo_project["code"]

    response = client.get(
        f"/memo/attached_obj/{AttachedObjectType.code.value}/to/{code.id}"
    )

    assert response.status_code == 200, response.text
    by_title = {
        m.title: m for m in (MemoRead.model_validate(x) for x in response.json())
    }
    assert by_title["Code Memo A"].is_favorite is True
    assert by_title["Code Memo B"].is_favorite is False
    assert by_title["Other Code Memo"].is_favorite is False


def test_get_memos_by_attached_object_not_existing(client: TestClient):
    """The attached object is resolved first, so an unknown id yields 404."""
    response = client.get(
        f"/memo/attached_obj/{AttachedObjectType.code.value}/to/99999"
    )
    assert response.status_code == 404, response.text


# ===========================================================================
# UPDATE MEMO (PATCH /memo/{memo_id}) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "payload",
    [
        # Update only the title.
        pytest.param({"title": "New Title Only"}, id="title_only"),
        # Update only the content.
        pytest.param({"content": "New content text"}, id="content_only"),
        # Update only the JSON content.
        pytest.param(
            {"content_json": '{"blocks": [{"type": "paragraph"}]}'},
            id="content_json_only",
        ),
        # Set the optional icon.
        pytest.param({"icon": "📝"}, id="set_icon"),
        # Update every field at once.
        pytest.param(
            {
                "title": "All fields",
                "content": "Updated!",
                "content_json": '{"blocks": []}',
                "icon": "✅",
            },
            id="all_fields",
        ),
    ],
)
def test_update_memo(
    client: TestClient,
    memo_project: MemoProjectState,
    payload: dict,
):
    """PATCH updates only the provided fields; omitted fields keep their value."""
    memo = memo_project["code_memo_a"]

    response = client.patch(f"/memo/{memo.id}", json=payload)

    assert response.status_code == 200, response.text
    updated = MemoRead.model_validate(response.json())
    assert updated.title == payload.get("title", memo.title)
    assert updated.content == payload.get("content", memo.content)
    assert updated.content_json == payload.get("content_json", memo.content_json)
    assert updated.icon == payload.get("icon", memo.icon)


# --- MemoUpdate validation contracts (HTTP 422) --------------------------------
# MemoUpdate requires at least one field to be set, and title/content/
# content_json may not be explicitly null. Both violations surface as 422.


def test_update_memo_with_no_fields_is_rejected(
    client: TestClient, memo_project: MemoProjectState
):
    """An empty update body violates the at-least-one-field validator -> 422."""
    response = client.patch(f"/memo/{memo_project['code_memo_a'].id}", json={})
    assert response.status_code == 422, response.text


@pytest.mark.parametrize(
    "payload",
    [
        # Explicit null title is not allowed.
        pytest.param({"title": None}, id="null_title"),
        # Explicit null content is not allowed.
        pytest.param({"content": None}, id="null_content"),
        # Explicit null content_json is not allowed.
        pytest.param({"content_json": None}, id="null_content_json"),
    ],
)
def test_update_memo_with_null_required_field_is_rejected(
    client: TestClient, memo_project: MemoProjectState, payload: dict
):
    """Explicitly nulling title/content/content_json is rejected -> 422."""
    response = client.patch(f"/memo/{memo_project['code_memo_a'].id}", json=payload)
    assert response.status_code == 422, response.text


def test_update_memo_not_existing(client: TestClient):
    """update_by_id reads the memo before authorizing, so an unknown id -> 404."""
    response = client.patch("/memo/99999", json={"title": "x"})
    assert response.status_code == 404, response.text


# ===========================================================================
# DELETE MEMO (DELETE /memo/{memo_id}) TESTS
# ===========================================================================


def test_delete_memo(client: TestClient, memo_project: MemoProjectState):
    """Deleting a memo returns it and removes it; a later read is no longer 200."""
    memo = memo_project["sdoc_memo"]

    response = client.delete(f"/memo/{memo.id}")

    assert response.status_code == 200, response.text
    deleted = MemoRead.model_validate(response.json())
    assert deleted.id == memo.id
    # Confirm deletion: the by-id read now hits the authz/existence path -> 403.
    follow_up = client.get(f"/memo/{memo.id}")
    assert follow_up.status_code == 403, follow_up.text


def test_delete_memo_not_existing(client: TestClient):
    """delete_by_id reads the memo before authorizing, so an unknown id -> 404."""
    response = client.delete("/memo/99999")
    assert response.status_code == 404, response.text


# ===========================================================================
# FAVORITE / UNFAVORITE MEMO (PUT|DELETE /memo/{memo_id}/favorite) TESTS
# ===========================================================================


def test_favorite_memo_marks_is_favorite_for_requesting_user(
    client: TestClient, memo_project: MemoProjectState
):
    """Favoriting a memo flips `is_favorite` to True for the requesting user."""
    # `user` has NOT favorited code_memo_b (only other_user has).
    memo = memo_project["code_memo_b"]

    response = client.put(f"/memo/{memo.id}/favorite")

    assert response.status_code == 200, response.text
    assert MemoRead.model_validate(response.json()).is_favorite is True


def test_unfavorite_memo_clears_is_favorite_for_requesting_user(
    client: TestClient, memo_project: MemoProjectState
):
    """Unfavoriting removes only the requesting user's favorite link."""
    # `user` HAS favorited code_memo_a.
    memo = memo_project["code_memo_a"]

    response = client.delete(f"/memo/{memo.id}/favorite")

    assert response.status_code == 200, response.text
    assert MemoRead.model_validate(response.json()).is_favorite is False


def test_favorite_is_idempotent_for_same_user(
    client: TestClient, memo_project: MemoProjectState
):
    """Re-favoriting an already-favorited memo is a no-op (on_conflict_do_nothing)."""
    # `user` already favorited code_memo_a in the fixture.
    memo = memo_project["code_memo_a"]

    response = client.put(f"/memo/{memo.id}/favorite")

    assert response.status_code == 200, response.text
    assert MemoRead.model_validate(response.json()).is_favorite is True


def test_favorite_memo_not_existing(client: TestClient):
    """Authorization runs before the existence check, so an unknown id -> 403."""
    response = client.put("/memo/99999/favorite")
    assert response.status_code == 403, response.text
