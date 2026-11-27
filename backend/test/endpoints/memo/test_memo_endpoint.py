import pytest
from fastapi.testclient import TestClient

from core.memo.memo_dto import MemoCreate, MemoRead
from core.memo.memo_enum import AttachedObjectType
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


def _url(project_id: int, path: str = "") -> str:
    """The URL of a memo route of the project."""
    return f"/projects/{project_id}/memos{path}"


def _create_payload(
    title: str,
    attached_object_type: AttachedObjectType,
    attached_object_id: int,
    content: str = "Some content",
) -> dict:
    """Build a JSON create payload for a memo via the real MemoCreate DTO."""
    return MemoCreate(
        title=title,
        content=content,
        content_json='{"blocks": []}',
        attached_object_type=attached_object_type,
        attached_object_id=attached_object_id,
    ).model_dump(mode="json")


# ===========================================================================
# CREATE MEMO (PUT /projects/{project_id}/memos) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "object_type",
    list(ATTACHABLE),
    ids=lambda t: t.value,
)
def test_create_memo_attaches_it_to_the_object(
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
        _url(memo_project["project"].id),
        json=_create_payload("New Memo", object_type, attached_object.id),
    )

    assert response.status_code == 200, response.text
    memo = MemoRead.model_validate(response.json())
    assert memo.title == "New Memo"
    assert memo.user_id == user.id
    assert memo.project_id == memo_project["project"].id
    assert memo.attached_object_id == attached_object.id
    assert memo.attached_object_type == object_type
    # A freshly created memo is not favorited by anyone.
    assert memo.is_favorite is False


def test_create_memo_allows_multiple_memos_per_user_per_object(
    client: TestClient, memo_project: MemoProjectState
):
    """A user may add another memo to an object that already has one of theirs.

    The old "one memo per user per object" rule is gone: `code` already carries
    two memos by `user`, and adding a third must succeed.
    """
    code = memo_project["code"]

    response = client.put(
        _url(memo_project["project"].id),
        json=_create_payload("Third User Memo", AttachedObjectType.code, code.id),
    )

    assert response.status_code == 200, response.text
    memo = MemoRead.model_validate(response.json())
    assert memo.user_id == memo_project["user"].id
    assert memo.attached_object_id == code.id


@pytest.mark.parametrize(
    "object_type",
    [t for t in ATTACHABLE if t is not AttachedObjectType.project],
    ids=lambda t: t.value,
)
def test_create_memo_on_an_object_of_another_project_is_a_conflict(
    client: TestClient,
    memo_project: MemoProjectState,
    object_type: AttachedObjectType,
):
    """The attached object is a body id of the write: an object of the fixture
    project created through `another_project` (where `user` is a member) is rejected
    by the composite foreign key of its object handle (409)."""
    attached_object = memo_project[ATTACHABLE[object_type]]

    response = client.put(
        _url(memo_project["another_project"].id),
        json=_create_payload("Should fail", object_type, attached_object.id),
    )

    assert response.status_code == 409, response.text


def test_create_memo_on_a_nonexistent_object_is_a_conflict(
    client: TestClient, memo_project: MemoProjectState
):
    """A nonexistent attached object fails the composite foreign key, too (409)."""
    response = client.put(
        _url(memo_project["project"].id),
        json=_create_payload("Should fail", AttachedObjectType.code, 99999),
    )
    assert response.status_code == 409, response.text


def test_create_memo_on_another_project_is_not_found(
    client: TestClient, memo_project: MemoProjectState
):
    """A memo can only be attached to the project of the path: another project
    (one of the user's) is not found (404)."""
    response = client.put(
        _url(memo_project["project"].id),
        json=_create_payload(
            "Should fail",
            AttachedObjectType.project,
            memo_project["another_project"].id,
        ),
    )
    assert response.status_code == 404, response.text


def test_create_memo_in_a_non_member_project_is_forbidden(
    client: TestClient, memo_project: MemoProjectState
):
    """Creating a memo in a project the user is no member of is forbidden (403)."""
    outsider_project = memo_project["outsider_project"]

    response = client.put(
        _url(outsider_project.id),
        json=_create_payload(
            "Should fail", AttachedObjectType.project, outsider_project.id
        ),
    )

    assert response.status_code == 403, response.text


# ===========================================================================
# GET MEMO (GET /projects/{project_id}/memos/{memo_id}) TESTS
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

    response = client.get(_url(memo_project["project"].id, f"/{memo.id}"))

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
    project_id = memo_project["project"].id
    fav = client.get(_url(project_id, f"/{memo_project['code_memo_a'].id}"))
    not_fav = client.get(_url(project_id, f"/{memo_project['code_memo_b'].id}"))

    assert fav.status_code == 200, fav.text
    assert not_fav.status_code == 200, not_fav.text
    assert MemoRead.model_validate(fav.json()).is_favorite is True
    assert MemoRead.model_validate(not_fav.json()).is_favorite is False


def test_get_memo_by_id_not_existing(
    client: TestClient, memo_project: MemoProjectState
):
    """An unknown memo id is not found in the project (404)."""
    response = client.get(_url(memo_project["project"].id, "/99999"))
    assert response.status_code == 404, response.text


def test_get_memo_of_another_project_is_not_found(
    client: TestClient, memo_project: MemoProjectState
):
    """The memo of `another_project` does not exist in the fixture project (404),
    although `user` is a member of both."""
    response = client.get(
        _url(memo_project["project"].id, f"/{memo_project['foreign_memo'].id}")
    )
    assert response.status_code == 404, response.text


# ===========================================================================
# LIST MEMOS (GET /projects/{project_id}/memos) TESTS
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
ALL_MEMO_TITLES = set().union(*EXPECTED_TITLES_BY_TYPE.values())


def _get_memo_titles(client: TestClient, project_id: int, **params) -> set[str]:
    """List the memos of the project with the given filters, return their titles."""
    response = client.get(_url(project_id), params=params)
    assert response.status_code == 200, response.text
    return {MemoRead.model_validate(m).title for m in response.json()}


@pytest.mark.parametrize(
    "object_type",
    list(ATTACHABLE),
    ids=lambda t: t.value,
)
def test_get_memos_by_attached_object_returns_all_object_memos(
    client: TestClient, memo_project: MemoProjectState, object_type: AttachedObjectType
):
    """Filtering by an object returns every memo attached to it, of all users.

    Parametrized over every non-deprecated AttachedObjectType.
    """
    attached_object = memo_project[ATTACHABLE[object_type]]

    response = client.get(
        _url(memo_project["project"].id),
        params={
            "attached_object_type": object_type.value,
            "attached_object_id": attached_object.id,
        },
    )

    assert response.status_code == 200, response.text
    memos = [MemoRead.model_validate(m) for m in response.json()]
    assert {m.title for m in memos} == EXPECTED_TITLES_BY_TYPE[object_type]
    # Every returned memo points back at the requested object.
    for m in memos:
        assert m.attached_object_id == attached_object.id
        assert m.attached_object_type == object_type


@pytest.mark.parametrize(
    "params_of,expected_titles",
    [
        # No filter: every memo of the project, none of `another_project`.
        pytest.param(lambda state: {}, ALL_MEMO_TITLES, id="no-filter"),
        # The type alone: the memos of every object of that type.
        pytest.param(
            lambda state: {"attached_object_type": AttachedObjectType.code.value},
            CODE_MEMO_TITLES,
            id="type-only",
        ),
        # The author: everything but the two memos of `other_user`.
        pytest.param(
            lambda state: {"user_id": state["other_user"].id},
            {"Other Code Memo", "Project Memo"},
            id="author",
        ),
        # Object and author together.
        pytest.param(
            lambda state: {
                "attached_object_type": AttachedObjectType.code.value,
                "attached_object_id": state["code"].id,
                "user_id": state["user"].id,
            },
            {"Code Memo A", "Code Memo B"},
            id="object-and-author",
        ),
        # A nonexistent object matches nothing.
        pytest.param(
            lambda state: {
                "attached_object_type": AttachedObjectType.code.value,
                "attached_object_id": 99999,
            },
            set(),
            id="nonexistent-object",
        ),
        # The code of `another_project` is a filter id of another project: no match.
        pytest.param(
            lambda state: {
                "attached_object_type": AttachedObjectType.code.value,
                "attached_object_id": state["foreign_code"].id,
            },
            set(),
            id="object-of-another-project",
        ),
    ],
)
def test_get_memos_filters(
    client: TestClient,
    memo_project: MemoProjectState,
    params_of,
    expected_titles: set[str],
):
    """The filters of the memo list combine; ids of another project match nothing."""
    assert (
        _get_memo_titles(client, memo_project["project"].id, **params_of(memo_project))
        == expected_titles
    )


def test_get_memos_by_attached_object_id_without_type_is_rejected(
    client: TestClient, memo_project: MemoProjectState
):
    """An attached object id is ambiguous without its type (400)."""
    response = client.get(
        _url(memo_project["project"].id),
        params={"attached_object_id": memo_project["code"].id},
    )
    assert response.status_code == 400, response.text


def test_get_memos_marks_requesting_user_favorites(
    client: TestClient, memo_project: MemoProjectState
):
    """In a list, `is_favorite` is still per requesting user.

    `user` favorited only "Code Memo A"; "Code Memo B" is favorited solely by
    `other_user`, so it must NOT be flagged for the requesting `user`.
    """
    code = memo_project["code"]

    response = client.get(
        _url(memo_project["project"].id),
        params={
            "attached_object_type": AttachedObjectType.code.value,
            "attached_object_id": code.id,
        },
    )

    assert response.status_code == 200, response.text
    by_title = {
        m.title: m for m in (MemoRead.model_validate(x) for x in response.json())
    }
    assert by_title["Code Memo A"].is_favorite is True
    assert by_title["Code Memo B"].is_favorite is False
    assert by_title["Other Code Memo"].is_favorite is False


def test_get_memos_of_a_non_member_project_is_forbidden(
    client: TestClient, memo_project: MemoProjectState
):
    """Listing the memos of a project the user is no member of is forbidden (403)."""
    response = client.get(_url(memo_project["outsider_project"].id))
    assert response.status_code == 403, response.text


# ===========================================================================
# UPDATE MEMO (PATCH /projects/{project_id}/memos/{memo_id}) TESTS
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

    response = client.patch(
        _url(memo_project["project"].id, f"/{memo.id}"), json=payload
    )

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
    response = client.patch(
        _url(memo_project["project"].id, f"/{memo_project['code_memo_a'].id}"),
        json={},
    )
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
    response = client.patch(
        _url(memo_project["project"].id, f"/{memo_project['code_memo_a'].id}"),
        json=payload,
    )
    assert response.status_code == 422, response.text


@pytest.mark.parametrize(
    "memo_id_of",
    [
        # A memo id that does not exist at all.
        pytest.param(lambda state: 99999, id="nonexistent"),
        # The memo of `another_project`, where `user` is a member, too.
        pytest.param(lambda state: state["foreign_memo"].id, id="of-another-project"),
    ],
)
def test_update_memo_not_in_the_project_is_not_found(
    client: TestClient, memo_project: MemoProjectState, memo_id_of
):
    """A memo that does not exist in the project of the path is not found (404),
    for a shared field and for a favorite."""
    url = _url(memo_project["project"].id, f"/{memo_id_of(memo_project)}")

    assert client.patch(url, json={"title": "x"}).status_code == 404
    assert client.patch(url, json={"is_favorite": True}).status_code == 404


def test_update_memo_of_another_member(
    client: TestClient, memo_project: MemoProjectState
):
    """A project member may update another member's memo (project membership is
    the only gate; ownership is not required). `code_memo_other` is owned by
    `other_user`, while the client authenticates as `user`."""
    memo = memo_project["code_memo_other"]

    response = client.patch(
        _url(memo_project["project"].id, f"/{memo.id}"),
        json={"title": "Edited by member"},
    )

    assert response.status_code == 200, response.text
    assert MemoRead.model_validate(response.json()).title == "Edited by member"


# --- favorites (PATCH with is_favorite) ---------------------------------------
# Favoriting is per-user state, updated through the normal update endpoint by
# setting `is_favorite`. There is no dedicated /favorite route.


def test_favorite_memo_marks_is_favorite_for_requesting_user(
    client: TestClient, memo_project: MemoProjectState
):
    """Setting `is_favorite` True flips it for the requesting user."""
    # `user` has NOT favorited code_memo_b (only other_user has).
    memo = memo_project["code_memo_b"]

    response = client.patch(
        _url(memo_project["project"].id, f"/{memo.id}"), json={"is_favorite": True}
    )

    assert response.status_code == 200, response.text
    assert MemoRead.model_validate(response.json()).is_favorite is True


def test_unfavorite_memo_clears_is_favorite_for_requesting_user(
    client: TestClient, memo_project: MemoProjectState
):
    """Setting `is_favorite` False removes only the requesting user's favorite."""
    # `user` HAS favorited code_memo_a.
    memo = memo_project["code_memo_a"]

    response = client.patch(
        _url(memo_project["project"].id, f"/{memo.id}"), json={"is_favorite": False}
    )

    assert response.status_code == 200, response.text
    assert MemoRead.model_validate(response.json()).is_favorite is False


def test_favorite_is_idempotent_for_same_user(
    client: TestClient, memo_project: MemoProjectState
):
    """Re-favoriting an already-favorited memo is a no-op (on_conflict_do_nothing)."""
    # `user` already favorited code_memo_a in the fixture.
    memo = memo_project["code_memo_a"]

    response = client.patch(
        _url(memo_project["project"].id, f"/{memo.id}"), json={"is_favorite": True}
    )

    assert response.status_code == 200, response.text
    assert MemoRead.model_validate(response.json()).is_favorite is True


# ===========================================================================
# BULK UPDATE MEMOS (PATCH /projects/{project_id}/memos/bulk) TESTS
# ===========================================================================


def test_update_memos_bulk_favorite_only(
    client: TestClient, memo_project: MemoProjectState
):
    """A favorite-only bulk update toggles the requesting user's favorites.

    `user` favorited `code_memo_a` but not `code_memo_b`; the update flips both.
    The entries carry no shared field, so the memos' data stays unchanged.
    """
    project_id = memo_project["project"].id
    memo_a = memo_project["code_memo_a"]
    memo_b = memo_project["code_memo_b"]

    response = client.patch(
        _url(project_id, "/bulk"),
        json=[
            {"memo_id": memo_a.id, "is_favorite": False},
            {"memo_id": memo_b.id, "is_favorite": True},
        ],
    )

    assert response.status_code == 200, response.text
    by_id = {m.id: m for m in (MemoRead.model_validate(i) for i in response.json())}
    assert by_id[memo_a.id].is_favorite is False
    assert by_id[memo_b.id].is_favorite is True
    assert by_id[memo_a.id].title == "Code Memo A"
    assert by_id[memo_b.id].title == "Code Memo B"
    # Confirm through the single-memo endpoint.
    assert MemoRead.model_validate(
        client.get(_url(project_id, f"/{memo_b.id}")).json()
    ).is_favorite


def test_update_memos_bulk_shared_fields(
    client: TestClient, memo_project: MemoProjectState
):
    """A bulk update of shared fields changes only the given fields of each memo."""
    memo_a = memo_project["code_memo_a"]
    memo_b = memo_project["code_memo_b"]

    response = client.patch(
        _url(memo_project["project"].id, "/bulk"),
        json=[
            {"memo_id": memo_a.id, "title": "Renamed A"},
            {"memo_id": memo_b.id, "icon": "🔥"},
        ],
    )

    assert response.status_code == 200, response.text
    by_id = {m.id: m for m in (MemoRead.model_validate(i) for i in response.json())}
    assert by_id[memo_a.id].title == "Renamed A"
    assert by_id[memo_a.id].content == memo_a.content
    assert by_id[memo_b.id].title == "Code Memo B"
    assert by_id[memo_b.id].icon == "🔥"


def test_update_memos_bulk_keeps_input_order(
    client: TestClient, memo_project: MemoProjectState
):
    """Favorite-only and shared-field entries come back in the order of the request."""
    memo_a = memo_project["code_memo_a"]
    memo_b = memo_project["code_memo_b"]

    response = client.patch(
        _url(memo_project["project"].id, "/bulk"),
        json=[
            {"memo_id": memo_b.id, "is_favorite": True},
            {"memo_id": memo_a.id, "title": "Renamed A"},
        ],
    )

    assert response.status_code == 200, response.text
    memos = [MemoRead.model_validate(i) for i in response.json()]
    assert [m.id for m in memos] == [memo_b.id, memo_a.id]
    assert memos[0].is_favorite is True
    assert memos[1].title == "Renamed A"


def test_update_memos_bulk_shared_fields_and_favorite(
    client: TestClient, memo_project: MemoProjectState
):
    """One entry may change shared fields and the favorite at the same time."""
    memo_b = memo_project["code_memo_b"]

    response = client.patch(
        _url(memo_project["project"].id, "/bulk"),
        json=[{"memo_id": memo_b.id, "title": "Renamed B", "is_favorite": True}],
    )

    assert response.status_code == 200, response.text
    (memo_read,) = [MemoRead.model_validate(i) for i in response.json()]
    assert memo_read.title == "Renamed B"
    assert memo_read.is_favorite is True


def test_update_memos_bulk_rejects_entry_without_updatable_field(
    client: TestClient, memo_project: MemoProjectState
):
    """An entry with only a memo_id has nothing to update -> 422."""
    response = client.patch(
        _url(memo_project["project"].id, "/bulk"),
        json=[{"memo_id": memo_project["code_memo_a"].id}],
    )
    assert response.status_code == 422, response.text


@pytest.mark.parametrize(
    "entry",
    [
        # A shared field of the other project's memo.
        pytest.param({"title": "x"}, id="shared-field"),
        # Only the favorite of the other project's memo.
        pytest.param({"is_favorite": True}, id="favorite-only"),
    ],
)
def test_update_memos_bulk_with_a_memo_of_another_project_is_not_found(
    client: TestClient, memo_project: MemoProjectState, entry: dict
):
    """A memo of `another_project` in the bulk update is not found in the fixture
    project (404), and the request changes nothing."""
    project_id = memo_project["project"].id
    memo_a = memo_project["code_memo_a"]

    response = client.patch(
        _url(project_id, "/bulk"),
        json=[
            {"memo_id": memo_a.id, "title": "Renamed A"},
            {"memo_id": memo_project["foreign_memo"].id, **entry},
        ],
    )

    assert response.status_code == 404, response.text
    memo = MemoRead.model_validate(client.get(_url(project_id, f"/{memo_a.id}")).json())
    assert memo.title == "Code Memo A"


# ===========================================================================
# RECENT MEMOS (PATCH …/memos/{memo_id}/mark-recent, GET …/memos?recent=true) TESTS
# ===========================================================================
#
# Recents are per-user and per-project. The test client authenticates as `user`
# (the fixture's `user`), so recording/reading recents always concerns `user`.
# The fixture itself records NO recents, so each test starts from an empty list.


def _record_recent(client: TestClient, project_id: int, memo_id: int) -> None:
    """Record a memo-open for the requesting user and assert it succeeded."""
    response = client.patch(_url(project_id, f"/{memo_id}/mark-recent"))
    assert response.status_code == 200, response.text


def _get_recent_ids(client: TestClient, project_id: int, **params) -> list[int]:
    """Read the requesting user's recent memos and return their ids in order."""
    response = client.get(_url(project_id), params={"recent": True, **params})
    assert response.status_code == 200, response.text
    return [MemoRead.model_validate(item).id for item in response.json()]


def test_record_recent_memo_returns_the_memo(
    client: TestClient, memo_project: MemoProjectState
):
    """Recording a recent returns the opened memo as a MemoRead."""
    memo = memo_project["code_memo_a"]

    response = client.patch(_url(memo_project["project"].id, f"/{memo.id}/mark-recent"))

    assert response.status_code == 200, response.text
    read = MemoRead.model_validate(response.json())
    assert (read.id, read.title) == (memo.id, "Code Memo A")


@pytest.mark.parametrize(
    "memo_id_of",
    [
        # A memo id that does not exist at all.
        pytest.param(lambda state: 99999, id="nonexistent"),
        # The memo of `another_project`, where `user` is a member, too.
        pytest.param(lambda state: state["foreign_memo"].id, id="of-another-project"),
    ],
)
def test_record_recent_memo_not_in_the_project_is_not_found(
    client: TestClient, memo_project: MemoProjectState, memo_id_of
):
    """Recording a memo that does not exist in the path's project answers 404."""
    response = client.patch(
        _url(memo_project["project"].id, f"/{memo_id_of(memo_project)}/mark-recent")
    )
    assert response.status_code == 404, response.text


def test_get_recent_memos_empty_initially(
    client: TestClient, memo_project: MemoProjectState
):
    """With nothing recorded, the recents list is empty."""
    assert _get_recent_ids(client, memo_project["project"].id) == []


def test_get_recent_memos_returns_recorded_memos(
    client: TestClient, memo_project: MemoProjectState
):
    """A recorded memo shows up in the recents list as a full MemoRead."""
    project = memo_project["project"]
    memo = memo_project["code_memo_a"]
    _record_recent(client, project.id, memo.id)

    response = client.get(_url(project.id), params={"recent": True})

    assert response.status_code == 200, response.text
    recents = [MemoRead.model_validate(item) for item in response.json()]
    assert [m.id for m in recents] == [memo.id]
    assert recents[0].title == "Code Memo A"
    # is_favorite is computed for the requesting user, who favorited code_memo_a.
    assert recents[0].is_favorite is True


def test_get_recent_memos_orders_by_last_opened_desc(
    client: TestClient, memo_project: MemoProjectState
):
    """Recents are ordered most-recently-opened first."""
    project = memo_project["project"]
    memo_a = memo_project["code_memo_a"]
    memo_b = memo_project["code_memo_b"]
    _record_recent(client, project.id, memo_a.id)
    _record_recent(client, project.id, memo_b.id)

    assert _get_recent_ids(client, project.id) == [memo_b.id, memo_a.id]


def test_record_recent_memo_reopen_bumps_to_front(
    client: TestClient, memo_project: MemoProjectState
):
    """Re-opening an already-recent memo moves it to the front (upsert, no duplicate)."""
    project = memo_project["project"]
    memo_a = memo_project["code_memo_a"]
    memo_b = memo_project["code_memo_b"]
    _record_recent(client, project.id, memo_a.id)
    _record_recent(client, project.id, memo_b.id)
    # Re-open A: it must jump ahead of B without creating a second row.
    _record_recent(client, project.id, memo_a.id)

    assert _get_recent_ids(client, project.id) == [memo_a.id, memo_b.id]


def test_get_recent_memos_respects_limit(
    client: TestClient, memo_project: MemoProjectState
):
    """The `limit` query param caps how many recents are returned."""
    project = memo_project["project"]
    memo_a = memo_project["code_memo_a"]
    memo_b = memo_project["code_memo_b"]
    tag_memo = memo_project["tag_memo"]
    _record_recent(client, project.id, memo_a.id)
    _record_recent(client, project.id, memo_b.id)
    _record_recent(client, project.id, tag_memo.id)

    assert _get_recent_ids(client, project.id, limit=2) == [tag_memo.id, memo_b.id]


def test_get_recent_memos_only_returns_memos_from_given_project(
    client: TestClient, memo_project: MemoProjectState
):
    """Recents are scoped to the requested project, not across projects."""
    _record_recent(client, memo_project["project"].id, memo_project["code_memo_a"].id)

    # `another_project` is a real project `user` belongs to, but has no recents.
    assert _get_recent_ids(client, memo_project["another_project"].id) == []


def test_get_recent_memos_non_member_project_returns_403(
    client: TestClient, memo_project: MemoProjectState
):
    """A project the requesting user is not a member of (including a nonexistent
    one) yields 403."""
    response = client.get(
        _url(memo_project["outsider_project"].id), params={"recent": True}
    )
    assert response.status_code == 403, response.text

    response = client.get(_url(99999), params={"recent": True})
    assert response.status_code == 403, response.text


# ===========================================================================
# DELETE MEMO (DELETE /projects/{project_id}/memos/{memo_id}) TESTS
# ===========================================================================


def test_delete_memo(client: TestClient, memo_project: MemoProjectState):
    """Deleting a memo returns it and removes it; a later read is 404."""
    project_id = memo_project["project"].id
    memo = memo_project["sdoc_memo"]

    response = client.delete(_url(project_id, f"/{memo.id}"))

    assert response.status_code == 200, response.text
    deleted = MemoRead.model_validate(response.json())
    assert deleted.id == memo.id
    follow_up = client.get(_url(project_id, f"/{memo.id}"))
    assert follow_up.status_code == 404, follow_up.text


@pytest.mark.parametrize(
    "memo_id_of",
    [
        # A memo id that does not exist at all.
        pytest.param(lambda state: 99999, id="nonexistent"),
        # The memo of `another_project`, where `user` is a member, too.
        pytest.param(lambda state: state["foreign_memo"].id, id="of-another-project"),
    ],
)
def test_delete_memo_not_in_the_project_is_not_found(
    client: TestClient, memo_project: MemoProjectState, memo_id_of
):
    """Deleting a memo that does not exist in the path's project answers 404."""
    response = client.delete(
        _url(memo_project["project"].id, f"/{memo_id_of(memo_project)}")
    )
    assert response.status_code == 404, response.text


def test_delete_memo_of_another_member(
    client: TestClient, memo_project: MemoProjectState
):
    """A project member may delete another member's memo (project membership is
    the only gate; ownership is not required). `code_memo_other` is owned by
    `other_user`, while the client authenticates as `user`."""
    project_id = memo_project["project"].id
    memo = memo_project["code_memo_other"]

    response = client.delete(_url(project_id, f"/{memo.id}"))

    assert response.status_code == 200, response.text
    assert MemoRead.model_validate(response.json()).id == memo.id
    follow_up = client.get(_url(project_id, f"/{memo.id}"))
    assert follow_up.status_code == 404, follow_up.text


# ===========================================================================
# BULK DELETE MEMOS (DELETE /projects/{project_id}/memos/bulk) TESTS
# ===========================================================================


def test_delete_memos_bulk(client: TestClient, memo_project: MemoProjectState):
    """Bulk delete removes all given memos and returns them as MemoRead list."""
    project_id = memo_project["project"].id
    memo_a = memo_project["code_memo_a"]
    memo_b = memo_project["code_memo_b"]

    response = client.request(
        "DELETE", _url(project_id, "/bulk"), json=[memo_a.id, memo_b.id]
    )

    assert response.status_code == 200, response.text
    returned_ids = {MemoRead.model_validate(item).id for item in response.json()}
    assert returned_ids == {memo_a.id, memo_b.id}
    for memo_id in (memo_a.id, memo_b.id):
        assert client.get(_url(project_id, f"/{memo_id}")).status_code == 404


def test_delete_memos_bulk_keeps_input_order(
    client: TestClient, memo_project: MemoProjectState
):
    """The response lists the deleted memos in the order of the request."""
    memo_a = memo_project["code_memo_a"]
    memo_b = memo_project["code_memo_b"]

    response = client.request(
        "DELETE", _url(memo_project["project"].id, "/bulk"), json=[memo_b.id, memo_a.id]
    )

    assert response.status_code == 200, response.text
    returned_ids = [MemoRead.model_validate(item).id for item in response.json()]
    assert returned_ids == [memo_b.id, memo_a.id]


def test_delete_memos_bulk_includes_other_members_memo(
    client: TestClient, memo_project: MemoProjectState
):
    """Bulk delete may include another member's memo (no owner check)."""
    own = memo_project["code_memo_a"]
    others = memo_project["code_memo_other"]

    response = client.request(
        "DELETE", _url(memo_project["project"].id, "/bulk"), json=[own.id, others.id]
    )

    assert response.status_code == 200, response.text
    returned_ids = {MemoRead.model_validate(item).id for item in response.json()}
    assert returned_ids == {own.id, others.id}


@pytest.mark.parametrize(
    "memo_id_of",
    [
        # A memo id that does not exist at all.
        pytest.param(lambda state: 999999, id="nonexistent"),
        # The memo of `another_project`, where `user` is a member, too.
        pytest.param(lambda state: state["foreign_memo"].id, id="of-another-project"),
    ],
)
def test_delete_memos_bulk_with_a_memo_not_in_the_project_deletes_nothing(
    client: TestClient, memo_project: MemoProjectState, memo_id_of
):
    """All-or-nothing: a memo that does not exist in the path's project rejects
    the whole request (404) and deletes nothing, also not the memo of
    `another_project`."""
    project_id = memo_project["project"].id
    memo_a = memo_project["code_memo_a"]

    response = client.request(
        "DELETE", _url(project_id, "/bulk"), json=[memo_a.id, memo_id_of(memo_project)]
    )

    assert response.status_code == 404, response.text
    assert client.get(_url(project_id, f"/{memo_a.id}")).status_code == 200
    foreign_memo = memo_project["foreign_memo"]
    assert (
        client.get(
            _url(memo_project["another_project"].id, f"/{foreign_memo.id}")
        ).status_code
        == 200
    )


# ===========================================================================
# MEMO SUGGESTIONS (POST /projects/{project_id}/memos/suggestions) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "object_type,object_id_of",
    [
        # A code that does not exist at all.
        pytest.param(AttachedObjectType.code, lambda state: 99999, id="nonexistent"),
        # The code of `another_project`, where `user` is a member, too.
        pytest.param(
            AttachedObjectType.code,
            lambda state: state["foreign_code"].id,
            id="code-of-another-project",
        ),
        # Another project than the path's.
        pytest.param(
            AttachedObjectType.project,
            lambda state: state["another_project"].id,
            id="another-project",
        ),
    ],
)
def test_suggest_memo_for_an_object_not_in_the_project_is_not_found(
    client: TestClient,
    memo_project: MemoProjectState,
    object_type: AttachedObjectType,
    object_id_of,
):
    """The object of a suggestion is read within the path's project before the
    LLM is asked, so an object that does not exist there answers 404."""
    response = client.post(
        _url(memo_project["project"].id, "/suggestions"),
        params={
            "attached_object_type": object_type.value,
            "attached_object_id": object_id_of(memo_project),
            "model": "unused",
        },
    )
    assert response.status_code == 404, response.text
