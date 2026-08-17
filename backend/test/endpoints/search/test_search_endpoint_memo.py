"""Endpoint tests for the memo search endpoints (/search/memo*).

All tests run against the deterministic `search_project` fixture (see conftest.py),
which builds one memo per (non-deprecated) AttachedObjectType:
- "Code Memo" (on code Alpha, by user)
- "Document Memo" (on sdoc_one, by other_user)
- "Span Memo" (on span_annotations[0], by user)
- "Sentence Memo" (on sentence_annotations[0], by other_user)
- "BBox Memo" (on bbox_annotations[0], by user)
- "Project Memo" (on the project, by other_user)
- "Tag Memo" (on the tag, by user)

AttachedObjectType.span_group is deprecated and intentionally not covered.
Because the data is fixed, every filter/group combination below has a known,
deterministic expected result.
"""

import re

import pytest
from fastapi.testclient import TestClient

from modules.search.memo_search.memo_search_columns import MemoColumns
from modules.search.search_dto import MemoRow, Page, QueryRequest
from systems.search_system.column_info import ColumnInfo
from systems.search_system.filtering import Filter, LogicalOperator
from systems.search_system.filtering_operators import (
    AttachedToOperator,
    BooleanOperator,
    DateOperator,
    IDOperator,
    StringOperator,
)
from systems.search_system.grouping import (
    DateGranularity,
    GroupConfig,
    GroupPage,
    GroupQueryRequest,
)

from .filter_utils import empty_filter, make_filter_expr, make_filter_tree

ALL_MEMOS = {
    "Code Memo",
    "Document Memo",
    "Span Memo",
    "Sentence Memo",
    "BBox Memo",
    "Project Memo",
    "Tag Memo",
}

# AttachedObjectType value -> the memo title attached to that object type.
# (span_group is deprecated and intentionally not covered.)
MEMOS_BY_TYPE = {
    "code": "Code Memo",
    "source_document": "Document Memo",
    "span_annotation": "Span Memo",
    "sentence_annotation": "Sentence Memo",
    "bbox_annotation": "BBox Memo",
    "project": "Project Memo",
    "tag": "Tag Memo",
}


# ===========================================================================
# INFO ENDPOINT
# ===========================================================================


def test_memo_info_groupable_flags(client: TestClient, search_project):
    """Memo info exposes every MemoColumns member; all but CONTENT are groupable."""
    response = client.post(
        "/search/memo_info", params={"project_id": search_project["project"].id}
    )
    assert response.status_code == 200, response.text
    infos = [ColumnInfo.model_validate(x) for x in response.json()]
    groupable = {info.column for info in infos if info.groupable}
    # CONTENT is the only non-groupable memo column.
    assert groupable == set(MemoColumns) - {MemoColumns.CONTENT}


# ===========================================================================
# ROW QUERIES — FILTERS
# ===========================================================================


def _memo_titles(client: TestClient, project_id: int, filter_tree: Filter) -> set[str]:
    """Run a memo row query and return the set of matching memo titles."""
    request = QueryRequest[MemoColumns](
        project_id=project_id,
        search_query="",
        filter=filter_tree,
        sorts=[],
        page_number=0,
        page_size=20,
    )
    response = client.post("/search/memo", json=request.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    return {m.title for m in Page[MemoRow].model_validate(response.json()).items}


@pytest.mark.parametrize(
    "filter_tree,expected_titles",
    [
        pytest.param(empty_filter(), ALL_MEMOS, id="no-filter"),
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1", MemoColumns.TITLE, StringOperator.CONTAINS, "Memo"
                    )
                ]
            ),
            ALL_MEMOS,
            id="title-contains",
        ),
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1", MemoColumns.TITLE, StringOperator.EQUALS, "Code Memo"
                    )
                ]
            ),
            {"Code Memo"},
            id="title-equals",
        ),
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1", MemoColumns.TITLE, StringOperator.NOT_EQUALS, "Code Memo"
                    )
                ]
            ),
            ALL_MEMOS - {"Code Memo"},
            id="title-not-equals",
        ),
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1", MemoColumns.TITLE, StringOperator.STARTS_WITH, "Code"
                    )
                ]
            ),
            {"Code Memo"},
            id="title-starts-with",
        ),
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1", MemoColumns.TITLE, StringOperator.ENDS_WITH, "Memo"
                    )
                ]
            ),
            ALL_MEMOS,
            id="title-ends-with",
        ),
    ],
)
def test_memo_rows_title_string_filters(
    client: TestClient, search_project, filter_tree, expected_titles
):
    """TITLE supports all five string operators."""
    assert (
        _memo_titles(client, search_project["project"].id, filter_tree)
        == expected_titles
    )


@pytest.mark.parametrize(
    "filter_tree,expected_titles",
    [
        # Every content reads "A memo on ...", so "memo on" matches all.
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1", MemoColumns.CONTENT, StringOperator.CONTAINS, "memo on"
                    )
                ]
            ),
            ALL_MEMOS,
            id="content-contains",
        ),
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1",
                        MemoColumns.CONTENT,
                        StringOperator.EQUALS,
                        "A memo on a tag",
                    )
                ]
            ),
            {"Tag Memo"},
            id="content-equals",
        ),
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1",
                        MemoColumns.CONTENT,
                        StringOperator.NOT_EQUALS,
                        "A memo on a tag",
                    )
                ]
            ),
            ALL_MEMOS - {"Tag Memo"},
            id="content-not-equals",
        ),
        # "A memo on the ..." -> Document ("the first document") + Project ("the project").
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1",
                        MemoColumns.CONTENT,
                        StringOperator.STARTS_WITH,
                        "A memo on the",
                    )
                ]
            ),
            {"Document Memo", "Project Memo"},
            id="content-starts-with",
        ),
        # Span/Sentence/BBox contents all end with "annotation".
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1",
                        MemoColumns.CONTENT,
                        StringOperator.ENDS_WITH,
                        "annotation",
                    )
                ]
            ),
            {"Span Memo", "Sentence Memo", "BBox Memo"},
            id="content-ends-with",
        ),
    ],
)
def test_memo_rows_content_string_filters(
    client: TestClient, search_project, filter_tree, expected_titles
):
    """CONTENT supports all five string operators."""
    assert (
        _memo_titles(client, search_project["project"].id, filter_tree)
        == expected_titles
    )


@pytest.mark.parametrize(
    "filter_tree,expected_titles",
    [
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1",
                        MemoColumns.ATTACHED_OBJECT_TYPE,
                        AttachedToOperator.EQUALS,
                        "code",
                    )
                ]
            ),
            {"Code Memo"},
            id="attached-type-equals-code",
        ),
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1",
                        MemoColumns.ATTACHED_OBJECT_TYPE,
                        AttachedToOperator.EQUALS,
                        "source_document",
                    )
                ]
            ),
            {"Document Memo"},
            id="attached-type-equals-sdoc",
        ),
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1",
                        MemoColumns.ATTACHED_OBJECT_TYPE,
                        AttachedToOperator.NOT_EQUALS,
                        "code",
                    )
                ]
            ),
            ALL_MEMOS - {"Code Memo"},
            id="attached-type-not-equals",
        ),
    ],
)
def test_memo_rows_attached_to_filters(
    client: TestClient, search_project, filter_tree, expected_titles
):
    """ATTACHED_OBJECT_TYPE supports the ATTACHED_TO equals/not-equals operators."""
    assert (
        _memo_titles(client, search_project["project"].id, filter_tree)
        == expected_titles
    )


@pytest.mark.parametrize(
    "filter_tree,expected_titles",
    [
        # --- two expressions combined with AND ---
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1", MemoColumns.TITLE, StringOperator.CONTAINS, "Memo"
                    ),
                    make_filter_expr(
                        "e2",
                        MemoColumns.ATTACHED_OBJECT_TYPE,
                        AttachedToOperator.EQUALS,
                        "code",
                    ),
                ]
            ),
            {"Code Memo"},
            id="and-combination",
        ),
        # --- two expressions combined with OR ---
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1", MemoColumns.TITLE, StringOperator.EQUALS, "Code Memo"
                    ),
                    make_filter_expr(
                        "e2", MemoColumns.TITLE, StringOperator.EQUALS, "Span Memo"
                    ),
                ],
                logic=LogicalOperator.or_,
            ),
            {"Code Memo", "Span Memo"},
            id="or-combination",
        ),
    ],
)
def test_memo_rows_logic_combinations(
    client: TestClient, search_project, filter_tree, expected_titles
):
    """Filter trees combine expressions with AND/OR logic."""
    assert (
        _memo_titles(client, search_project["project"].id, filter_tree)
        == expected_titles
    )


@pytest.mark.parametrize(
    "attached_type,expected_title",
    [
        pytest.param(attached_type, title, id=f"type-{attached_type}")
        for attached_type, title in MEMOS_BY_TYPE.items()
    ],
)
def test_memo_rows_filter_by_attached_object_type(
    client: TestClient, search_project, attached_type, expected_title
):
    """Filtering by each ATTACHED_OBJECT_TYPE returns exactly the memo of that type."""
    assert _memo_titles(
        client,
        search_project["project"].id,
        make_filter_tree(
            [
                make_filter_expr(
                    "e1",
                    MemoColumns.ATTACHED_OBJECT_TYPE,
                    AttachedToOperator.EQUALS,
                    attached_type,
                )
            ]
        ),
    ) == {expected_title}


@pytest.mark.parametrize(
    "operator,user_key,expected_titles",
    [
        # test_user authored Code, Span, BBox, Tag memos.
        pytest.param(
            IDOperator.EQUALS,
            "user",
            {"Code Memo", "Span Memo", "BBox Memo", "Tag Memo"},
            id="user-equals",
        ),
        # NOT_EQUALS test_user -> only other_user's memos.
        pytest.param(
            IDOperator.NOT_EQUALS,
            "user",
            {"Document Memo", "Sentence Memo", "Project Memo"},
            id="user-not-equals",
        ),
        # Sanity: filtering by other_user yields their three memos.
        pytest.param(
            IDOperator.EQUALS,
            "other_user",
            {"Document Memo", "Sentence Memo", "Project Memo"},
            id="other-user-equals",
        ),
    ],
)
def test_memo_rows_id_filters(
    client: TestClient, search_project, operator, user_key, expected_titles
):
    """Memo USER_ID filter matches by authoring user."""
    user_id = search_project[user_key].id
    assert (
        _memo_titles(
            client,
            search_project["project"].id,
            make_filter_tree(
                [make_filter_expr("e1", MemoColumns.USER_ID, operator, user_id)]
            ),
        )
        == expected_titles
    )


@pytest.mark.parametrize(
    "operator,object_key,expected_titles",
    [
        # EQUALS the code's id -> only the memo on that code.
        pytest.param(IDOperator.EQUALS, "code_alpha", {"Code Memo"}, id="code-equals"),
        # EQUALS the sdoc's id -> only the memo on that document.
        pytest.param(
            IDOperator.EQUALS, "sdoc_one", {"Document Memo"}, id="sdoc-equals"
        ),
        # NOT_EQUALS the code's id -> all but the code memo.
        pytest.param(
            IDOperator.NOT_EQUALS,
            "code_alpha",
            ALL_MEMOS - {"Code Memo"},
            id="code-not-equals",
        ),
    ],
)
def test_memo_rows_attached_object_id_filters(
    client: TestClient, search_project, operator, object_key, expected_titles
):
    """Memo ATTACHED_OBJECT_ID filter matches by the attached object's id."""
    object_id = search_project[object_key].id
    assert (
        _memo_titles(
            client,
            search_project["project"].id,
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1", MemoColumns.ATTACHED_OBJECT_ID, operator, object_id
                    )
                ]
            ),
        )
        == expected_titles
    )


@pytest.mark.parametrize(
    "operator,value,expected_titles",
    [
        # No memo is favorited -> EQUALS False matches all, True matches none.
        pytest.param(BooleanOperator.EQUALS, False, ALL_MEMOS, id="equals-false"),
        pytest.param(BooleanOperator.EQUALS, True, set(), id="equals-true"),
        # NOT_EQUALS False matches none; NOT_EQUALS True matches all.
        pytest.param(BooleanOperator.NOT_EQUALS, False, set(), id="not-equals-false"),
        pytest.param(BooleanOperator.NOT_EQUALS, True, ALL_MEMOS, id="not-equals-true"),
    ],
)
def test_memo_rows_boolean_filter(
    client: TestClient, search_project, operator, value, expected_titles
):
    """Memo FAVORITE boolean filter (no favorites exist in the fixture)."""
    assert (
        _memo_titles(
            client,
            search_project["project"].id,
            make_filter_tree(
                [make_filter_expr("e1", MemoColumns.FAVORITE, operator, value)]
            ),
        )
        == expected_titles
    )


# ===========================================================================
# ROW QUERIES — DATE FILTERS
# ===========================================================================
# The fixture back-dates a deterministic subset of memos to yesterday (see
# search/conftest.py), so the memo set is split across two days:
#   yesterday: Code Memo, Span Memo, BBox Memo          (test_user-authored)
#   today:     Document, Sentence, Project, Tag Memos   (other_user-authored)
# This makes every date operator distinguishable, unlike a single-day fixture
# where LT/GT and LTE/GTE would be indistinguishable.

# Memos created/updated yesterday (back-dated in the fixture).
YESTERDAY_MEMOS = {"Code Memo", "Span Memo", "BBox Memo"}
# Memos created/updated today.
TODAY_MEMOS = ALL_MEMOS - YESTERDAY_MEMOS


@pytest.mark.parametrize("date_column", [MemoColumns.CREATED, MemoColumns.UPDATED])
@pytest.mark.parametrize(
    "operator,day,expected",
    [
        # --- relative to TODAY ---
        pytest.param(DateOperator.EQUALS, "today", "today_set", id="equals-today"),
        pytest.param(DateOperator.LT, "today", "yesterday_set", id="lt-today"),
        pytest.param(DateOperator.LTE, "today", "all", id="lte-today"),
        pytest.param(DateOperator.GT, "today", "none", id="gt-today"),
        pytest.param(DateOperator.GTE, "today", "today_set", id="gte-today"),
        # --- relative to YESTERDAY ---
        pytest.param(
            DateOperator.EQUALS, "yesterday", "yesterday_set", id="equals-yesterday"
        ),
        pytest.param(DateOperator.LT, "yesterday", "none", id="lt-yesterday"),
        pytest.param(
            DateOperator.LTE, "yesterday", "yesterday_set", id="lte-yesterday"
        ),
        pytest.param(DateOperator.GT, "yesterday", "today_set", id="gt-yesterday"),
        pytest.param(DateOperator.GTE, "yesterday", "all", id="gte-yesterday"),
    ],
)
def test_memo_rows_date_filters(
    client: TestClient, search_project, date_column, operator, day, expected
):
    """CREATED and UPDATED support all five date operators, distinguished by day.

    Memos are split across two days (see fixture), so each operator yields a
    distinct, deterministic result relative to both today and yesterday.
    """
    project_id = search_project["project"].id
    # memos[0] is a back-dated (yesterday) memo; memos[1] is a today memo.
    yesterday = search_project["memos"][0].created.date()
    today = search_project["memos"][1].created.date()
    reference_day = (today if day == "today" else yesterday).isoformat()

    expected_titles = {
        "all": ALL_MEMOS,
        "none": set(),
        "today_set": TODAY_MEMOS,
        "yesterday_set": YESTERDAY_MEMOS,
    }[expected]

    assert (
        _memo_titles(
            client,
            project_id,
            make_filter_tree(
                [make_filter_expr("e1", date_column, operator, reference_day)]
            ),
        )
        == expected_titles
    )


# ===========================================================================
# ROW QUERIES — INVALID FILTER VALUES (HTTP 400 contracts)
# ===========================================================================
# Pydantic validates that `value` is a bool/str/int/list, but NOT that its type
# matches the operator. A wrong-typed or malformed value therefore reaches
# `*Operator.apply()`, which raises InvalidFilterValueError (or
# InvalidFilterValueFormatError). Both are registered with a 400 handler, so the
# endpoint returns HTTP 400 and we assert on the response body.


@pytest.mark.parametrize(
    "column,operator,value,match",
    [
        # --- StringOperator requires str ---
        pytest.param(
            MemoColumns.TITLE,
            StringOperator.EQUALS,
            123,
            r"Invalid value type for StringOperator \(requires str\)",
            id="title-string-non-str",
        ),
        pytest.param(
            MemoColumns.CONTENT,
            StringOperator.CONTAINS,
            123,
            r"Invalid value type for StringOperator \(requires str\)",
            id="content-string-non-str",
        ),
        # --- IDOperator requires int or str ---
        pytest.param(
            MemoColumns.USER_ID,
            IDOperator.EQUALS,
            1.5,
            r"Invalid value type for IDOperator \(requires int or str\)",
            id="user-id-non-int-str",
        ),
        pytest.param(
            MemoColumns.ATTACHED_OBJECT_ID,
            IDOperator.EQUALS,
            1.5,
            r"Invalid value type for IDOperator \(requires int or str\)",
            id="attached-object-id-non-int-str",
        ),
        # --- AttachedToOperator requires str, then a valid AttachedObjectType ---
        pytest.param(
            MemoColumns.ATTACHED_OBJECT_TYPE,
            AttachedToOperator.EQUALS,
            123,
            r"Invalid value type for AttachedToOperator \(requires str\)",
            id="attached-to-non-str",
        ),
        pytest.param(
            MemoColumns.ATTACHED_OBJECT_TYPE,
            AttachedToOperator.EQUALS,
            "bogus",
            r"is not a valid AttachedObjectType",
            id="attached-to-invalid-enum-value",
        ),
        # --- DateOperator requires str, then a parseable date ---
        pytest.param(
            MemoColumns.CREATED,
            DateOperator.EQUALS,
            123,
            r"Invalid value type for DateOperator \(requires str\)",
            id="created-date-non-str",
        ),
        pytest.param(
            MemoColumns.CREATED,
            DateOperator.EQUALS,
            "not-a-date",
            r"Invalid date format",
            id="created-date-unparseable",
        ),
        pytest.param(
            MemoColumns.UPDATED,
            DateOperator.EQUALS,
            123,
            r"Invalid value type for DateOperator \(requires str\)",
            id="updated-date-non-str",
        ),
        pytest.param(
            MemoColumns.UPDATED,
            DateOperator.EQUALS,
            "not-a-date",
            r"Invalid date format",
            id="updated-date-unparseable",
        ),
        # --- BooleanOperator requires bool ---
        pytest.param(
            MemoColumns.FAVORITE,
            BooleanOperator.EQUALS,
            "yes",
            r"Invalid value type for BooleanOperator \(requires bool\)",
            id="favorite-bool-non-bool",
        ),
    ],
)
def test_memo_rows_invalid_filter_values(
    client: TestClient, search_project, column, operator, value, match
):
    """Wrong-typed/malformed filter values are rejected with HTTP 400."""
    request = QueryRequest[MemoColumns](
        project_id=search_project["project"].id,
        search_query="",
        filter=make_filter_tree([make_filter_expr("e1", column, operator, value)]),
        sorts=[],
        page_number=0,
        page_size=20,
    )
    response = client.post("/search/memo", json=request.model_dump(mode="json"))
    assert response.status_code == 400, response.text
    assert re.search(match, response.text), response.text


# ===========================================================================
# ROW QUERIES — INVALID OPERATOR (operator/column family mismatch)
# ===========================================================================
# The FilterExpression model_validator rejects an operator whose family does not
# match the column's declared family, raising OperatorNotCompatibleWithColumnError.
# That exception is registered with a 400 handler, so the endpoint returns HTTP 400.
# NOTE: metadata (int) columns are NOT validated (their family needs a DB lookup),
# so only enum columns are tested here.


@pytest.mark.parametrize(
    "column,operator,value",
    [
        # TITLE is a STRING column; pair it with non-STRING operators.
        pytest.param(
            MemoColumns.TITLE,
            DateOperator.EQUALS,
            "2024-01-01",
            id="title-string-with-date-op",
        ),
        pytest.param(
            MemoColumns.TITLE,
            BooleanOperator.EQUALS,
            True,
            id="title-string-with-bool-op",
        ),
        # USER_ID is an ID column; pair it with a STRING operator.
        pytest.param(
            MemoColumns.USER_ID,
            StringOperator.CONTAINS,
            "1",
            id="user-id-with-string-op",
        ),
        # ATTACHED_OBJECT_TYPE is an ATTACHED_TO column; pair it with an ID operator.
        pytest.param(
            MemoColumns.ATTACHED_OBJECT_TYPE,
            IDOperator.EQUALS,
            1,
            id="attached-type-with-id-op",
        ),
        # CREATED is a DATE column; pair it with a STRING operator.
        pytest.param(
            MemoColumns.CREATED,
            StringOperator.EQUALS,
            "2024-01-01",
            id="created-date-with-string-op",
        ),
        # FAVORITE is a BOOLEAN column; pair it with a STRING operator.
        pytest.param(
            MemoColumns.FAVORITE,
            StringOperator.EQUALS,
            "true",
            id="favorite-bool-with-string-op",
        ),
    ],
)
def test_memo_rows_invalid_operator(
    client: TestClient, search_project, column, operator, value
):
    """An operator whose family mismatches the column's family is rejected (400)."""
    request = QueryRequest[MemoColumns](
        project_id=search_project["project"].id,
        search_query="",
        filter=make_filter_tree([make_filter_expr("e1", column, operator, value)]),
        sorts=[],
        page_number=0,
        page_size=20,
    )
    response = client.post("/search/memo", json=request.model_dump(mode="json"))
    assert response.status_code == 400, response.text
    assert "not compatible with column" in response.text


# ===========================================================================
# ROW QUERIES — SEARCH QUERY & PAGINATION
# ===========================================================================


def test_memo_rows_search_query(client: TestClient, search_project):
    """Memo full-text search matches against title/content."""
    request = QueryRequest[MemoColumns](
        project_id=search_project["project"].id,
        search_query="document",
        filter=empty_filter(),
        sorts=[],
        page_number=0,
        page_size=20,
    )
    response = client.post("/search/memo", json=request.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    page = Page[MemoRow].model_validate(response.json())
    # "Document Memo" title and "A memo on the first document" content both match.
    assert {m.title for m in page.items} == {"Document Memo"}


def test_memo_rows_pagination(client: TestClient, search_project):
    """Memo row query paginates deterministically (default sort: updated desc)."""

    def _page(page_number: int) -> Page[MemoRow]:
        request = QueryRequest[MemoColumns](
            project_id=search_project["project"].id,
            search_query="",
            filter=empty_filter(),
            sorts=[],
            page_number=page_number,
            page_size=2,
        )
        return Page[MemoRow].model_validate(
            client.post("/search/memo", json=request.model_dump(mode="json")).json()
        )

    page0 = _page(0)
    page1 = _page(1)
    assert page0.total_results == 7
    assert len(page0.items) == 2
    assert len(page1.items) == 2
    # No overlap between pages.
    assert {m.id for m in page0.items}.isdisjoint({m.id for m in page1.items})


# ===========================================================================
# GROUP QUERIES
# ===========================================================================
# Every memo column except CONTENT is groupable (see MemoColumns.is_groupable).
# Grouping partitions by KEY (never label); each column defines its own key/label
# and optionally a drill-down target (see MemoColumns.get_group_expressions).
#
# Deterministic fixture facts used below:
#   - 7 memos, one per attached-object type.
#   - Authors: "Test User" authored Code/Span/BBox/Tag (4); "Other Author"
#     authored Document/Sentence/Project (3).
#   - Dates: Code/Span/BBox back-dated to yesterday; the other four today.
#   - No favorites exist.


def _memo_groups(
    client: TestClient,
    project_id: int,
    group_by: GroupConfig,
    filter_tree: Filter | None = None,
    search_query: str = "",
    page_number: int = 0,
    page_size: int = 20,
) -> GroupPage:
    """POST a group query and return the validated GroupPage."""
    request = GroupQueryRequest[MemoColumns](
        project_id=project_id,
        search_query=search_query,
        filter=filter_tree if filter_tree is not None else empty_filter(),
        group_by=group_by,
        page_number=page_number,
        page_size=page_size,
    )
    response = client.post("/search/memo/groups", json=request.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    return GroupPage.model_validate(response.json())


# --- A. per-column happy paths -----------------------------------------------


def test_memo_groups_by_attached_object_type(client: TestClient, search_project):
    """Grouping by attached_object_type yields one bucket per type with counts."""
    page = _memo_groups(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_TYPE),
    )
    counts = {g.key: g.total_results for g in page.items}
    # One memo per attached-object type.
    assert counts == {attached_type: 1 for attached_type in MEMOS_BY_TYPE}
    assert page.total_results == len(MEMOS_BY_TYPE)


def test_memo_groups_by_user(client: TestClient, search_project):
    """Grouping by author yields one bucket per authoring user."""
    page = _memo_groups(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.USER_ID),
    )
    # user authored 4 memos (Code, Span, BBox, Tag); other_user authored 3.
    counts = {g.label: g.total_results for g in page.items}
    assert counts == {"Test User": 4, "Other Author": 3}
    assert page.total_results == 2


def test_memo_groups_by_title_initial(client: TestClient, search_project):
    """Grouping by title buckets memos by their first letter (A-Z)."""
    page = _memo_groups(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.TITLE),
    )
    # First letters: C(ode), D(ocument), S(pan), S(entence), B(Box), P(roject), T(ag).
    counts = {g.key: g.total_results for g in page.items}
    assert counts == {"C": 1, "D": 1, "S": 2, "B": 1, "P": 1, "T": 1}
    assert page.total_results == 6


def test_memo_groups_by_attached_object_id_sets_target(
    client: TestClient, search_project
):
    """Grouping by attached_object_id yields one bucket per object with a target."""
    page = _memo_groups(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_ID),
    )
    # One memo per attached object -> 7 buckets of 1, each with a navigation target.
    assert page.total_results == len(MEMOS_BY_TYPE)
    for group in page.items:
        assert group.total_results == 1
        assert group.target_id is not None
        assert group.target_type in MEMOS_BY_TYPE
        # key is "<type>:<id>".
        assert group.key == f"{group.target_type}:{group.target_id}"


def test_memo_groups_by_favorite(client: TestClient, search_project):
    """Grouping by favorite yields a single 'Not favorites' bucket (none exist)."""
    page = _memo_groups(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.FAVORITE),
    )
    assert page.total_results == 1
    group = page.items[0]
    assert group.key == "False"
    assert group.label == "Not favorites"
    assert group.total_results == 7


@pytest.mark.parametrize("date_column", [MemoColumns.CREATED, MemoColumns.UPDATED])
@pytest.mark.parametrize(
    "granularity,expected_counts",
    [
        # DAY splits the back-dated (3) from the today (4) memos -> 2 buckets.
        pytest.param(DateGranularity.DAY, sorted([3, 4]), id="day"),
        # WEEK/MONTH/YEAR: both days fall in the same bucket -> a single group of 7.
        pytest.param(DateGranularity.WEEK, [7], id="week"),
        pytest.param(DateGranularity.MONTH, [7], id="month"),
        pytest.param(DateGranularity.YEAR, [7], id="year"),
        # Default (no granularity) falls back to MONTH -> a single group of 7.
        pytest.param(None, [7], id="default-month"),
    ],
)
def test_memo_groups_by_date_granularity(
    client: TestClient, search_project, date_column, granularity, expected_counts
):
    """CREATED/UPDATED group into date buckets sized by the granularity."""
    page = _memo_groups(
        client,
        search_project["project"].id,
        GroupConfig(field=date_column, date_granularity=granularity),
    )
    assert sorted(g.total_results for g in page.items) == expected_counts
    assert page.total_results == len(expected_counts)


# --- B. labels & ordering ------------------------------------------------------


def test_memo_groups_attached_object_type_labels(client: TestClient, search_project):
    """ATTACHED_OBJECT_TYPE group labels replace underscores with spaces."""
    page = _memo_groups(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_TYPE),
    )
    labels = {g.key: g.label for g in page.items}
    assert labels["source_document"] == "source document"
    assert labels["span_annotation"] == "span annotation"
    assert labels["code"] == "code"


def test_memo_groups_sorted_alphabetically_by_label(client: TestClient, search_project):
    """Non-date groups are ordered alphabetically by label."""
    page = _memo_groups(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_TYPE),
    )
    labels = [g.label for g in page.items]
    assert labels == sorted(labels)


def test_memo_groups_date_sorted_newest_first(client: TestClient, search_project):
    """Date groups are ordered newest bucket first."""
    page = _memo_groups(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.CREATED, date_granularity=DateGranularity.DAY),
    )
    assert page.total_results == 2
    # Newest (today, 4 memos) comes before yesterday (3 memos).
    assert [g.total_results for g in page.items] == [4, 3]
    assert page.items[0].key > page.items[1].key


# --- C. grouping combined with filter / search ---------------------------------


def test_memo_groups_with_filter(client: TestClient, search_project):
    """A filter is applied before grouping: only matching rows are bucketed."""
    page = _memo_groups(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_TYPE),
        filter_tree=make_filter_tree(
            [
                make_filter_expr(
                    "e1",
                    MemoColumns.USER_ID,
                    IDOperator.EQUALS,
                    search_project["user"].id,
                )
            ]
        ),
    )
    # Only test_user's 4 memos (Code, Span, BBox, Tag) are grouped.
    counts = {g.key: g.total_results for g in page.items}
    assert counts == {
        "code": 1,
        "span_annotation": 1,
        "bbox_annotation": 1,
        "tag": 1,
    }
    assert page.total_results == 4


def test_memo_groups_with_search_query(client: TestClient, search_project):
    """A full-text search query is applied before grouping."""
    page = _memo_groups(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_TYPE),
        search_query="document",
    )
    # Only "Document Memo" matches -> a single source_document bucket.
    assert page.total_results == 1
    assert page.items[0].key == "source_document"
    assert page.items[0].total_results == 1


# --- D. pagination ---------------------------------------------------------------


def test_memo_groups_pagination(client: TestClient, search_project):
    """Group queries paginate over groups (not rows)."""

    def _page(page_number: int) -> GroupPage:
        return _memo_groups(
            client,
            search_project["project"].id,
            GroupConfig(field=MemoColumns.ATTACHED_OBJECT_TYPE),
            page_number=page_number,
            page_size=2,
        )

    page0 = _page(0)
    page1 = _page(1)
    assert page0.total_results == 7
    assert len(page0.items) == 2
    assert len(page1.items) == 2
    # No overlap between pages.
    assert {g.key for g in page0.items}.isdisjoint({g.key for g in page1.items})


# --- E. errors & edge cases ------------------------------------------------------


def test_memo_groups_non_groupable_column_raises(client: TestClient, search_project):
    """Grouping by CONTENT (not groupable) is rejected with HTTP 400."""
    request = GroupQueryRequest[MemoColumns](
        project_id=search_project["project"].id,
        search_query="",
        filter=empty_filter(),
        group_by=GroupConfig(field=MemoColumns.CONTENT),
        page_number=0,
        page_size=20,
    )
    response = client.post("/search/memo/groups", json=request.model_dump(mode="json"))
    assert response.status_code == 400, response.text
    assert "does not support grouping" in response.text


def test_memo_groups_empty_result(client: TestClient, search_project):
    """A filter matching nothing yields zero groups."""
    page = _memo_groups(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_TYPE),
        filter_tree=make_filter_tree(
            [
                make_filter_expr(
                    "e1", MemoColumns.TITLE, StringOperator.EQUALS, "No such memo"
                )
            ]
        ),
    )
    assert page.items == []
    assert page.total_results == 0


# ===========================================================================
# DRILL-DOWN (group_by + group_key on the row query)
# ===========================================================================
# A row query that sets BOTH group_by and group_key is restricted to the single
# group identified by group_key (exprs.key == group_key). group_by without
# group_key (or vice versa) has NO effect on a row query.


def _drill_down(
    client: TestClient,
    project_id: int,
    group_by: GroupConfig | None,
    group_key: str | None,
) -> Page[MemoRow]:
    """POST a row query with optional drill-down and return the validated Page."""
    request = QueryRequest[MemoColumns](
        project_id=project_id,
        search_query="",
        filter=empty_filter(),
        sorts=[],
        group_by=group_by,
        group_key=group_key,
        page_number=0,
        page_size=20,
    )
    response = client.post("/search/memo", json=request.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    return Page[MemoRow].model_validate(response.json())


@pytest.mark.parametrize(
    "group_key,expected_titles",
    [
        pytest.param("code", {"Code Memo"}, id="code"),
        pytest.param("source_document", {"Document Memo"}, id="source-document"),
        pytest.param("tag", {"Tag Memo"}, id="tag"),
    ],
)
def test_memo_drill_down_by_attached_object_type(
    client: TestClient, search_project, group_key, expected_titles
):
    """Drilling into an attached-object-type group returns only that group's rows."""
    page = _drill_down(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_TYPE),
        group_key,
    )
    assert page.total_results == len(expected_titles)
    assert {m.title for m in page.items} == expected_titles


def test_memo_drill_down_by_user(client: TestClient, search_project):
    """Drilling into an author group returns only that author's memos."""
    page = _drill_down(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.USER_ID),
        str(search_project["user"].id),
    )
    assert {m.title for m in page.items} == {
        "Code Memo",
        "Span Memo",
        "BBox Memo",
        "Tag Memo",
    }


def test_memo_drill_down_by_favorite(client: TestClient, search_project):
    """Drilling into the (only) favorite bucket returns all memos."""
    page = _drill_down(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.FAVORITE),
        "False",
    )
    assert page.total_results == 7
    assert {m.title for m in page.items} == ALL_MEMOS


def test_memo_drill_down_by_date_bucket(client: TestClient, search_project):
    """Drilling into a DAY date bucket returns only that day's memos.

    This mirrors the real two-request flow: fetch the DAY groups, then drill into
    the older (yesterday) bucket using the key the groups endpoint returned. This
    avoids hardcoding PostgreSQL's timestamp-cast string format.
    """
    project_id = search_project["project"].id
    group_config = GroupConfig(
        field=MemoColumns.CREATED, date_granularity=DateGranularity.DAY
    )
    groups = _memo_groups(client, project_id, group_config)
    # Two day-buckets, newest first: [today (4), yesterday (3)].
    assert [g.total_results for g in groups.items] == [4, 3]
    yesterday_key = groups.items[1].key

    page = _drill_down(client, project_id, group_config, yesterday_key)
    assert {m.title for m in page.items} == YESTERDAY_MEMOS


def test_memo_drill_down_nonexistent_key(client: TestClient, search_project):
    """A group_key matching no group yields an empty page."""
    page = _drill_down(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_TYPE),
        "no-such-group",
    )
    assert page.items == []
    assert page.total_results == 0


def test_memo_drill_down_group_by_without_key_is_noop(
    client: TestClient, search_project
):
    """group_by alone (no group_key) does NOT restrict a row query."""
    page = _drill_down(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_TYPE),
        None,
    )
    assert page.total_results == 7
    assert {m.title for m in page.items} == ALL_MEMOS


def test_memo_drill_down_key_without_group_by_is_noop(
    client: TestClient, search_project
):
    """group_key alone (no group_by) does NOT restrict a row query."""
    page = _drill_down(
        client,
        search_project["project"].id,
        None,
        "code",
    )
    assert page.total_results == 7
    assert {m.title for m in page.items} == ALL_MEMOS


def test_memo_drill_down_non_groupable_column_raises(
    client: TestClient, search_project
):
    """Drilling into a non-groupable column (CONTENT) is rejected with HTTP 400."""
    request = QueryRequest[MemoColumns](
        project_id=search_project["project"].id,
        search_query="",
        filter=empty_filter(),
        sorts=[],
        group_by=GroupConfig(field=MemoColumns.CONTENT),
        group_key="x",
        page_number=0,
        page_size=20,
    )
    response = client.post("/search/memo", json=request.model_dump(mode="json"))
    assert response.status_code == 400, response.text
    assert "does not support grouping" in response.text
