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
