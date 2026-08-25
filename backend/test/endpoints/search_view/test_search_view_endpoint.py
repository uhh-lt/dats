"""Endpoint tests for the search-view module (/searchView).

A search view stores a reusable search configuration (filters, sorts, grouping,
layout) for one entity type, scoped to a (user, project). Tests that need existing
views use the `search_view_project` fixture (see conftest.py); create tests use the
bare `test_project` fixture because they assert on a fresh, empty project.
"""

import pytest
from fastapi.testclient import TestClient

from core.user.user_dto import UserRead
from modules.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
from modules.search.memo_search.memo_search_columns import MemoColumns
from modules.search.sent_anno_search.sent_anno_search_columns import SentAnnoColumns
from modules.search.span_anno_search.span_anno_search_columns import SpanColumns
from modules.search_view.search_view_dto import (
    BBoxSearchViewCreate,
    BBoxSearchViewRead,
    MemoSearchViewCreate,
    MemoSearchViewRead,
    SearchEntityType,
    SearchViewLayout,
    SentenceSearchViewCreate,
    SentenceSearchViewRead,
    SpanSearchViewCreate,
    SpanSearchViewRead,
)
from systems.search_system.grouping import DateGranularity

from .conftest import SearchViewProjectState
from .view_utils import string_filter_tree

# Map entity type -> (create DTO, read DTO, a valid STRING-filterable column for it).
# The column is used to build a minimal valid filter tree for that entity.
ENTITY_CASES = {
    SearchEntityType.MEMO: (
        MemoSearchViewCreate,
        MemoSearchViewRead,
        MemoColumns.TITLE,
    ),
    SearchEntityType.SPAN_ANNOTATION: (
        SpanSearchViewCreate,
        SpanSearchViewRead,
        SpanColumns.SPAN_TEXT,
    ),
    SearchEntityType.SENTENCE_ANNOTATION: (
        SentenceSearchViewCreate,
        SentenceSearchViewRead,
        SentAnnoColumns.SOURCE_DOCUMENT_NAME,
    ),
    SearchEntityType.BBOX_ANNOTATION: (
        BBoxSearchViewCreate,
        BBoxSearchViewRead,
        BBoxColumns.SOURCE_DOCUMENT_NAME,
    ),
}


def _create_payload(entity_type: SearchEntityType, project_id: int, name: str) -> dict:
    """Build a minimal valid create payload for `entity_type` (TABLE layout, one
    string filter, no sorts/grouping)."""
    create_cls, _, column = ENTITY_CASES[entity_type]
    dto = create_cls(
        project_id=project_id,
        name=name,
        layout=SearchViewLayout.TABLE,
        filters=string_filter_tree(column, "test"),
        sorts=[],
    )
    return dto.model_dump(mode="json")


# ===========================================================================
# CREATE SEARCH VIEW (POST /searchView) TESTS
# ===========================================================================


# One case per entity type: a view can be created for each of the four entities.
@pytest.mark.parametrize("entity_type", list(ENTITY_CASES), ids=lambda e: e.value)
def test_create_search_view(
    client: TestClient, test_project, test_user: UserRead, entity_type: SearchEntityType
):
    """A view can be created for each entity type; the response carries the correct
    owner, entity, and position 0. The listing endpoint is used to confirm the view
    was actually persisted."""
    _, read_model, _ = ENTITY_CASES[entity_type]

    response = client.post(
        "/searchView", json=_create_payload(entity_type, test_project.id, "My view")
    )
    assert response.status_code == 200, response.text
    view = read_model.model_validate(response.json())
    assert view.name == "My view"
    assert view.entity_type == entity_type
    assert view.project_id == test_project.id
    assert view.user_id == test_user.id
    assert view.position == 0

    list_response = client.get(
        f"/searchView/project/{test_project.id}",
        params={"entity_type": entity_type.value},
    )
    assert list_response.status_code == 200, list_response.text
    views = [read_model.model_validate(v) for v in list_response.json()]
    assert [v.id for v in views] == [view.id]


def test_create_search_view_positions_increment_independently_per_entity(
    client: TestClient, test_project, test_user: UserRead
):
    """Position is assigned per (project, user, entity_type): two memo views get
    positions 0 and 1, while a span view starts again at position 0."""
    for i in range(2):
        response = client.post(
            "/searchView",
            json=_create_payload(SearchEntityType.MEMO, test_project.id, f"memo-{i}"),
        )
        assert response.status_code == 200, response.text
        assert MemoSearchViewRead.model_validate(response.json()).position == i

    span_response = client.post(
        "/searchView",
        json=_create_payload(
            SearchEntityType.SPAN_ANNOTATION, test_project.id, "span-0"
        ),
    )
    assert span_response.status_code == 200, span_response.text
    assert SpanSearchViewRead.model_validate(span_response.json()).position == 0


def test_create_search_view_duplicate_name_rejected_within_same_entity(
    client: TestClient, test_project, test_user: UserRead
):
    """The (user, project, entity_type, lower(name)) unique index rejects a second
    view with the same name for the same entity, but allows it for another entity."""
    payload = _create_payload(SearchEntityType.MEMO, test_project.id, "dup")
    assert client.post("/searchView", json=payload).status_code == 200

    response = client.post("/searchView", json=payload)
    assert response.status_code in (400, 409), response.text

    other = _create_payload(SearchEntityType.SPAN_ANNOTATION, test_project.id, "dup")
    assert client.post("/searchView", json=other).status_code == 200


# --- Board-group validation (HTTP 422 contracts) -----------------------------
# A BOARD view must be grouped; a date group without a granularity defaults to month.


def test_create_search_view_board_layout_without_group_is_rejected(
    client: TestClient, test_project, test_user: UserRead
):
    """A BOARD view without a group_by fails DTO validation (HTTP 422)."""
    payload = _create_payload(SearchEntityType.MEMO, test_project.id, "board-no-group")
    payload["layout"] = SearchViewLayout.BOARD.value
    payload["group_by"] = None
    response = client.post("/searchView", json=payload)
    assert response.status_code == 422, response.text


def test_create_search_view_board_layout_with_date_group_defaults_granularity(
    client: TestClient, test_project, test_user: UserRead
):
    """A BOARD view grouped by a date column is accepted; a missing date_granularity
    defaults to month."""
    payload = _create_payload(SearchEntityType.MEMO, test_project.id, "board-grouped")
    payload["layout"] = SearchViewLayout.BOARD.value
    payload["group_by"] = {"field": "M_CREATED", "date_granularity": None}
    response = client.post("/searchView", json=payload)
    assert response.status_code == 200, response.text
    view = MemoSearchViewRead.model_validate(response.json())
    assert view.group_by is not None
    assert view.group_by.date_granularity == DateGranularity.MONTH


# --- selected_properties -----------------------------------------------------
# `selected_properties` accepts any valid column of the entity (renderability is a
# frontend concern; the backend does not restrict it). Omitted -> None (the
# frontend's default selection); a provided list round-trips as column values.


@pytest.mark.parametrize("entity_type", list(ENTITY_CASES), ids=lambda e: e.value)
def test_create_search_view_selected_properties_roundtrip(
    client: TestClient, test_project, test_user: UserRead, entity_type: SearchEntityType
):
    """A provided selected_properties list is stored and returned per entity."""
    _, read_model, column = ENTITY_CASES[entity_type]

    payload = _create_payload(entity_type, test_project.id, "with-props")
    payload["selected_properties"] = [column.value]
    response = client.post("/searchView", json=payload)
    assert response.status_code == 200, response.text
    view = read_model.model_validate(response.json())
    assert view.selected_properties == [column]


@pytest.mark.parametrize("entity_type", list(ENTITY_CASES), ids=lambda e: e.value)
def test_create_search_view_selected_properties_defaults_to_none(
    client: TestClient, test_project, test_user: UserRead, entity_type: SearchEntityType
):
    """Not providing selected_properties stores None (the frontend's default
    selection). `_create_payload` serializes the DTO with `model_dump`, so the key
    is present with value None — equivalent to omitting it."""
    _, read_model, _ = ENTITY_CASES[entity_type]

    payload = _create_payload(entity_type, test_project.id, "no-props")
    assert payload["selected_properties"] is None
    response = client.post("/searchView", json=payload)
    assert response.status_code == 200, response.text
    view = read_model.model_validate(response.json())
    assert view.selected_properties is None


# --- name validation -----------------------------------------------------------


def test_create_search_view_blank_name_rejected(
    client: TestClient, test_project, test_user: UserRead
):
    """A whitespace-only name fails validation (HTTP 422). The name is overwritten
    after building the payload because the DTO constructor would reject it before
    the request is ever sent."""
    payload = _create_payload(SearchEntityType.MEMO, test_project.id, "valid")
    payload["name"] = "   "
    response = client.post("/searchView", json=payload)
    assert response.status_code == 422, response.text


def test_create_search_view_name_is_trimmed(
    client: TestClient, test_project, test_user: UserRead
):
    """Leading/trailing whitespace is stripped from the name on create."""
    payload = _create_payload(SearchEntityType.MEMO, test_project.id, "  padded  ")
    response = client.post("/searchView", json=payload)
    assert response.status_code == 200, response.text
    assert MemoSearchViewRead.model_validate(response.json()).name == "padded"


# --- sorts null normalization ----------------------------------------------------
# `sorts` is non-nullable; an explicit null is normalized to "no sorting" ([]).


def test_create_search_view_null_sorts_normalized_to_empty(
    client: TestClient, test_project, test_user: UserRead
):
    """Sending `sorts: null` on create is stored as an empty sort list."""
    payload = _create_payload(SearchEntityType.MEMO, test_project.id, "null-sorts")
    payload["sorts"] = None
    response = client.post("/searchView", json=payload)
    assert response.status_code == 200, response.text
    assert MemoSearchViewRead.model_validate(response.json()).sorts == []


# --- group_by validation branches --------------------------------------------------
# validate_group_by: non-groupable columns are rejected; a non-date groupable
# column has its granularity forced to None.


def test_create_search_view_non_groupable_column_rejected(
    client: TestClient, test_project, test_user: UserRead
):
    """Grouping by a non-groupable column (memo CONTENT) fails validation (422)."""
    payload = _create_payload(SearchEntityType.MEMO, test_project.id, "bad-group")
    payload["group_by"] = {"field": MemoColumns.CONTENT.value, "date_granularity": None}
    response = client.post("/searchView", json=payload)
    assert response.status_code == 422, response.text


def test_create_search_view_non_date_group_forces_granularity_none(
    client: TestClient, test_project, test_user: UserRead
):
    """Grouping by a non-date column (memo TITLE) forces date_granularity to None,
    even if a granularity is sent."""
    payload = _create_payload(SearchEntityType.MEMO, test_project.id, "title-group")
    payload["group_by"] = {
        "field": MemoColumns.TITLE.value,
        "date_granularity": DateGranularity.DAY.value,
    }
    response = client.post("/searchView", json=payload)
    assert response.status_code == 200, response.text
    view = MemoSearchViewRead.model_validate(response.json())
    assert view.group_by is not None
    assert view.group_by.date_granularity is None


# --- authorization (HTTP 403) ------------------------------------------------------


def test_create_search_view_by_non_member_forbidden(
    client: TestClient, non_member_client: TestClient, test_project
):
    """A non-member cannot create a view in the project (HTTP 403)."""
    payload = _create_payload(SearchEntityType.MEMO, test_project.id, "intruder")
    response = non_member_client.post("/searchView", json=payload)
    assert response.status_code == 403, response.text


# ===========================================================================
# LIST SEARCH VIEWS (GET /searchView/project/{project_id}) TESTS
# ===========================================================================


def test_list_search_views_returns_only_requested_entity_ordered_by_position(
    client: TestClient, search_view_project: SearchViewProjectState
):
    """Listing memo views returns exactly the three memo views in position order;
    views of other entity types are not included."""
    project = search_view_project["project"]

    response = client.get(
        f"/searchView/project/{project.id}",
        params={"entity_type": SearchEntityType.MEMO.value},
    )
    assert response.status_code == 200, response.text
    views = [MemoSearchViewRead.model_validate(v) for v in response.json()]
    assert [v.id for v in views] == [
        search_view_project["memo_view_a"].id,
        search_view_project["memo_view_b"].id,
        search_view_project["memo_view_c"].id,
    ]
    assert [v.position for v in views] == [0, 1, 2]


def test_list_search_views_returns_selected_properties(
    client: TestClient, search_view_project: SearchViewProjectState
):
    """The listing round-trips selected_properties: memo_view_a has [M_TITLE,
    M_CREATED], the other memo views have None."""
    project = search_view_project["project"]

    response = client.get(
        f"/searchView/project/{project.id}",
        params={"entity_type": SearchEntityType.MEMO.value},
    )
    assert response.status_code == 200, response.text
    views = [MemoSearchViewRead.model_validate(v) for v in response.json()]
    assert views[0].selected_properties == [MemoColumns.TITLE, MemoColumns.CREATED]
    assert views[1].selected_properties is None
    assert views[2].selected_properties is None


def test_list_search_views_per_entity(
    client: TestClient, search_view_project: SearchViewProjectState
):
    """Each non-memo entity has exactly one view at position 0."""
    project = search_view_project["project"]
    cases = [
        (SearchEntityType.SPAN_ANNOTATION, SpanSearchViewRead, "span_view"),
        (SearchEntityType.SENTENCE_ANNOTATION, SentenceSearchViewRead, "sentence_view"),
        (SearchEntityType.BBOX_ANNOTATION, BBoxSearchViewRead, "bbox_view"),
    ]
    for entity_type, read_model, key in cases:
        response = client.get(
            f"/searchView/project/{project.id}",
            params={"entity_type": entity_type.value},
        )
        assert response.status_code == 200, response.text
        views = [read_model.model_validate(v) for v in response.json()]
        assert [v.id for v in views] == [search_view_project[key].id]
        assert views[0].position == 0


# --- authorization (HTTP 403) ------------------------------------------------------


def test_list_search_views_by_non_member_forbidden(
    client: TestClient, non_member_client: TestClient, test_project
):
    """A non-member cannot list the project's views (HTTP 403)."""
    response = non_member_client.get(
        f"/searchView/project/{test_project.id}",
        params={"entity_type": SearchEntityType.MEMO.value},
    )
    assert response.status_code == 403, response.text


# ===========================================================================
# UPDATE SEARCH VIEW (PATCH /searchView/{view_id}) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "payload,assertion",
    [
        # Rename only.
        pytest.param(
            {"name": "Renamed"},
            lambda v: v.name == "Renamed",
            id="name",
        ),
        # Change layout only.
        pytest.param(
            {"layout": SearchViewLayout.LIST.value},
            lambda v: v.layout == SearchViewLayout.LIST,
            id="layout",
        ),
        # Replace the filter tree.
        pytest.param(
            {
                "filters": string_filter_tree(MemoColumns.TITLE, "updated").model_dump(
                    mode="json"
                )
            },
            lambda v: v.filters.items[0].value == "updated",
            id="filters",
        ),
        # Set grouping (date column -> granularity defaults to month).
        pytest.param(
            {"group_by": {"field": "M_CREATED", "date_granularity": None}},
            lambda v: (
                v.group_by is not None
                and v.group_by.date_granularity == DateGranularity.MONTH
            ),
            id="group_by-set",
        ),
        # Replace sorts.
        pytest.param(
            {"sorts": [{"column": "M_TITLE", "direction": "desc"}]},
            lambda v: len(v.sorts) == 1 and v.sorts[0].direction.value == "desc",
            id="sorts-replace",
        ),
        # Replace selected_properties.
        pytest.param(
            {"selected_properties": ["M_CONTENT", "M_FAVORITE"]},
            lambda v: (
                v.selected_properties == [MemoColumns.CONTENT, MemoColumns.FAVORITE]
            ),
            id="selected-properties-replace",
        ),
    ],
)
def test_update_search_view(
    client: TestClient,
    search_view_project: SearchViewProjectState,
    payload: dict,
    assertion,
):
    """PATCH updates the provided field(s) on an existing view and returns the
    updated view; omitted fields are left unchanged."""
    view = search_view_project["memo_view_a"]

    response = client.patch(f"/searchView/{view.id}", json=payload)
    assert response.status_code == 200, response.text
    updated = MemoSearchViewRead.model_validate(response.json())
    assert assertion(updated)


def test_update_search_view_clear_group_by(
    client: TestClient, search_view_project: SearchViewProjectState
):
    """Sending `group_by: null` clears an existing group (omitting it would keep it)."""
    view = search_view_project["memo_view_a"]

    # First set a group so there is something to clear.
    set_response = client.patch(
        f"/searchView/{view.id}",
        json={"group_by": {"field": "M_CREATED", "date_granularity": None}},
    )
    assert set_response.status_code == 200, set_response.text
    assert MemoSearchViewRead.model_validate(set_response.json()).group_by is not None

    clear_response = client.patch(f"/searchView/{view.id}", json={"group_by": None})
    assert clear_response.status_code == 200, clear_response.text
    assert MemoSearchViewRead.model_validate(clear_response.json()).group_by is None


def test_update_search_view_clear_sorts(
    client: TestClient, search_view_project: SearchViewProjectState
):
    """Sending `sorts: []` clears an existing sort list."""
    view = search_view_project["memo_view_a"]

    set_response = client.patch(
        f"/searchView/{view.id}",
        json={"sorts": [{"column": "M_TITLE", "direction": "asc"}]},
    )
    assert set_response.status_code == 200, set_response.text
    assert len(MemoSearchViewRead.model_validate(set_response.json()).sorts) == 1

    clear_response = client.patch(f"/searchView/{view.id}", json={"sorts": []})
    assert clear_response.status_code == 200, clear_response.text
    assert MemoSearchViewRead.model_validate(clear_response.json()).sorts == []


# --- selected_properties update semantics ------------------------------------
# memo_view_a starts with selected_properties [M_TITLE, M_CREATED]. Sending
# `selected_properties: null` clears it to None; omitting the field keeps it.


def test_update_search_view_clear_selected_properties(
    client: TestClient, search_view_project: SearchViewProjectState
):
    """Sending `selected_properties: null` clears an existing selection to None."""
    view = search_view_project["memo_view_a"]

    response = client.patch(
        f"/searchView/{view.id}", json={"selected_properties": None}
    )
    assert response.status_code == 200, response.text
    assert (
        MemoSearchViewRead.model_validate(response.json()).selected_properties is None
    )


def test_update_search_view_omitted_selected_properties_is_kept(
    client: TestClient, search_view_project: SearchViewProjectState
):
    """Omitting `selected_properties` leaves the existing selection unchanged."""
    view = search_view_project["memo_view_a"]

    response = client.patch(f"/searchView/{view.id}", json={"name": "Renamed"})
    assert response.status_code == 200, response.text
    assert MemoSearchViewRead.model_validate(response.json()).selected_properties == [
        MemoColumns.TITLE,
        MemoColumns.CREATED,
    ]


def test_update_search_view_bumps_updated_keeps_created(
    client: TestClient, search_view_project: SearchViewProjectState
):
    """PATCH keeps `created` unchanged and never moves `updated` backwards.

    `updated` is set by the DB via ON UPDATE CURRENT_TIMESTAMP (second precision),
    so within the same second it may equal the prior value; hence `>=`, not `>`.
    The rename proves the update actually happened."""
    view = search_view_project["memo_view_b"]
    before = MemoSearchViewRead.model_validate(view)

    response = client.patch(f"/searchView/{view.id}", json={"name": "Renamed"})
    assert response.status_code == 200, response.text
    after = MemoSearchViewRead.model_validate(response.json())
    assert after.name == "Renamed"
    assert after.created == before.created
    assert after.updated >= before.updated


# --- name validation -----------------------------------------------------------


def test_update_search_view_blank_name_rejected(
    client: TestClient, search_view_project: SearchViewProjectState
):
    """A whitespace-only name fails validation on update (HTTP 422)."""
    view = search_view_project["memo_view_a"]
    response = client.patch(f"/searchView/{view.id}", json={"name": "   "})
    assert response.status_code == 422, response.text


def test_update_search_view_name_is_trimmed(
    client: TestClient, search_view_project: SearchViewProjectState
):
    """Leading/trailing whitespace is stripped from the name on update."""
    view = search_view_project["memo_view_a"]
    response = client.patch(f"/searchView/{view.id}", json={"name": "  padded  "})
    assert response.status_code == 200, response.text
    assert MemoSearchViewRead.model_validate(response.json()).name == "padded"


# --- sorts null normalization ----------------------------------------------------


def test_update_search_view_null_sorts_clears(
    client: TestClient, search_view_project: SearchViewProjectState
):
    """Sending `sorts: null` on update clears an existing sort list."""
    view = search_view_project["memo_view_a"]

    set_response = client.patch(
        f"/searchView/{view.id}",
        json={"sorts": [{"column": "M_TITLE", "direction": "asc"}]},
    )
    assert set_response.status_code == 200, set_response.text
    assert len(MemoSearchViewRead.model_validate(set_response.json()).sorts) == 1

    clear_response = client.patch(f"/searchView/{view.id}", json={"sorts": None})
    assert clear_response.status_code == 200, clear_response.text
    assert MemoSearchViewRead.model_validate(clear_response.json()).sorts == []


# --- group_by validation branches --------------------------------------------------


def test_update_search_view_explicit_date_granularity_preserved(
    client: TestClient, search_view_project: SearchViewProjectState
):
    """An explicit date_granularity on a date column is preserved (not defaulted)."""
    view = search_view_project["memo_view_a"]
    response = client.patch(
        f"/searchView/{view.id}",
        json={
            "group_by": {
                "field": "M_CREATED",
                "date_granularity": DateGranularity.YEAR.value,
            }
        },
    )
    assert response.status_code == 200, response.text
    updated = MemoSearchViewRead.model_validate(response.json())
    assert updated.group_by is not None
    assert updated.group_by.date_granularity == DateGranularity.YEAR


# --- error paths (HTTP 404) --------------------------------------------------------


def test_update_search_view_unknown_id_returns_404(client: TestClient, test_project):
    """PATCH on a nonexistent view id returns HTTP 404."""
    response = client.patch("/searchView/999999", json={"name": "x"})
    assert response.status_code == 404, response.text


# --- authorization (HTTP 403) ------------------------------------------------------
# Only the owner may update a view. `other_member_client` is a project member who
# owns no views.


def test_update_search_view_by_non_owner_forbidden(
    client: TestClient,
    other_member_client: TestClient,
    search_view_project: SearchViewProjectState,
):
    """A project member who does not own the view cannot update it (HTTP 403)."""
    view = search_view_project["memo_view_a"]
    response = other_member_client.patch(
        f"/searchView/{view.id}", json={"name": "hijacked"}
    )
    assert response.status_code == 403, response.text


# ===========================================================================
# REORDER SEARCH VIEWS (PUT /searchView/project/{project_id}/order) TESTS
# ===========================================================================


def test_reorder_search_views(
    client: TestClient, search_view_project: SearchViewProjectState
):
    """Reordering assigns sequential positions matching the submitted id order."""
    project = search_view_project["project"]
    ids = [
        search_view_project["memo_view_a"].id,
        search_view_project["memo_view_b"].id,
        search_view_project["memo_view_c"].id,
    ]

    response = client.put(
        f"/searchView/project/{project.id}/order",
        params={"entity_type": SearchEntityType.MEMO.value},
        json={"view_ids": list(reversed(ids))},
    )
    assert response.status_code == 200, response.text
    reordered = [MemoSearchViewRead.model_validate(v) for v in response.json()]
    assert [v.id for v in reordered] == list(reversed(ids))
    assert [v.position for v in reordered] == [0, 1, 2]


def test_reorder_search_views_rejects_incomplete_id_set(
    client: TestClient, search_view_project: SearchViewProjectState
):
    """The order must contain every view of the entity exactly once; omitting one
    is rejected with HTTP 400."""
    project = search_view_project["project"]
    ids = [
        search_view_project["memo_view_a"].id,
        search_view_project["memo_view_b"].id,
    ]

    response = client.put(
        f"/searchView/project/{project.id}/order",
        params={"entity_type": SearchEntityType.MEMO.value},
        json={"view_ids": ids},
    )
    assert response.status_code == 400, response.text


def test_reorder_search_views_rejects_duplicate_ids(
    client: TestClient, search_view_project: SearchViewProjectState
):
    """An order containing the same view id twice fails DTO validation (HTTP 422)."""
    project = search_view_project["project"]
    duplicate = search_view_project["memo_view_a"].id

    response = client.put(
        f"/searchView/project/{project.id}/order",
        params={"entity_type": SearchEntityType.MEMO.value},
        json={"view_ids": [duplicate, duplicate]},
    )
    assert response.status_code == 422, response.text


# --- authorization (HTTP 403) ------------------------------------------------------


def test_reorder_search_views_by_non_member_forbidden(
    client: TestClient, non_member_client: TestClient, test_project
):
    """A non-member cannot reorder the project's views (HTTP 403)."""
    response = non_member_client.put(
        f"/searchView/project/{test_project.id}/order",
        params={"entity_type": SearchEntityType.MEMO.value},
        json={"view_ids": []},
    )
    assert response.status_code == 403, response.text


# ===========================================================================
# DELETE SEARCH VIEW (DELETE /searchView/{view_id}) TESTS
# ===========================================================================


def test_delete_search_view(
    client: TestClient, search_view_project: SearchViewProjectState
):
    """DELETE returns the deleted view and removes it from the listing."""
    project = search_view_project["project"]
    view = search_view_project["memo_view_a"]

    delete_response = client.delete(f"/searchView/{view.id}")
    assert delete_response.status_code == 200, delete_response.text
    assert MemoSearchViewRead.model_validate(delete_response.json()).id == view.id

    list_response = client.get(
        f"/searchView/project/{project.id}",
        params={"entity_type": SearchEntityType.MEMO.value},
    )
    assert list_response.status_code == 200, list_response.text
    remaining = [MemoSearchViewRead.model_validate(v) for v in list_response.json()]
    assert [v.id for v in remaining] == [
        search_view_project["memo_view_b"].id,
        search_view_project["memo_view_c"].id,
    ]


# --- error paths (HTTP 404) --------------------------------------------------------


def test_delete_search_view_unknown_id_returns_404(client: TestClient, test_project):
    """DELETE on a nonexistent view id returns HTTP 404."""
    response = client.delete("/searchView/999999")
    assert response.status_code == 404, response.text


# --- authorization (HTTP 403) ------------------------------------------------------
# Only the owner may delete a view. `other_member_client` is a project member who
# owns no views.


def test_delete_search_view_by_non_owner_forbidden(
    client: TestClient,
    other_member_client: TestClient,
    search_view_project: SearchViewProjectState,
):
    """A project member who does not own the view cannot delete it (HTTP 403)."""
    view = search_view_project["memo_view_a"]
    response = other_member_client.delete(f"/searchView/{view.id}")
    assert response.status_code == 403, response.text
