"""Endpoint tests for the memo search (/search/memo*) and the annotation search
(/search/*_annotation*) routes of search_endpoint.py.

The annotation tests cover span, sentence, and bbox annotations, parametrized
across the three entities. All tests run against the deterministic
`search_project` fixture (see conftest.py), which builds 7 memos and 2
annotations of each type split across codes/users/sdocs/tags/folders/memos.

Because the data is fixed, every filter/group combination below has a known,
deterministic expected result. The fixture docstring documents the exact
contents and the non-obvious derived behavior (NULL memo columns, the TAG/FOLDER
aggregates, the "This"/"is" span-text trap).
"""

import re

import pytest
from fastapi.testclient import TestClient

from core.memo.memo_dto import MemoRead
from core.memo.memo_enum import AttachedObjectType
from modules.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
from modules.search.memo_search.memo_search_columns import MemoColumns
from modules.search.search_dto import (
    BBoxAnnotationRow,
    Page,
    QueryRequest,
    SentenceAnnotationRow,
    SpanAnnotationRow,
)
from modules.search.sent_anno_search.sent_anno_search_columns import SentAnnoColumns
from modules.search.span_anno_search.span_anno_search_columns import SpanColumns
from systems.search_system.column_info import ColumnInfo
from systems.search_system.filtering import Filter, FilterExpression, LogicalOperator
from systems.search_system.filtering_operators import (
    AttachedObjectOperator,
    AttachedObjectTypeOperator,
    BooleanOperator,
    DateOperator,
    IDListRecursiveOperator,
    IDOperator,
    StringOperator,
)
from systems.search_system.grouping import (
    DateGranularity,
    GroupConfig,
    GroupPage,
    GroupQueryRequest,
)
from systems.search_system.sorting import Sort, SortDirection

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


# ---------------------------------------------------------------------------
# Entity matrix: per-entity constants used to parametrize across span/sentence/bbox.
# ---------------------------------------------------------------------------

SPAN_URL = "/search/span_annotation"
SENT_URL = "/search/sentence_annotation"
BBOX_URL = "/search/bbox_annotation"

SPAN_INFO_URL = "/search/span_annotation_info"
SENT_INFO_URL = "/search/sentence_annotation_info"
BBOX_INFO_URL = "/search/bbox_annotation_info"

SPAN_GROUPS_URL = "/search/span_annotation/groups"
SENT_GROUPS_URL = "/search/sentence_annotation/groups"
BBOX_GROUPS_URL = "/search/bbox_annotation/groups"

# entity -> (row model, columns enum, fixture annotation list key)
ENTITY = {
    "span": (SpanAnnotationRow, SpanColumns, "span_annotations"),
    "sentence": (SentenceAnnotationRow, SentAnnoColumns, "sentence_annotations"),
    "bbox": (BBoxAnnotationRow, BBoxColumns, "bbox_annotations"),
}

# Groupable columns per entity.
GROUPABLE = {
    "span": {
        SpanColumns.CODE_ID_LIST_RECURSIVE,
        SpanColumns.USER_ID,
        SpanColumns.SOURCE_USER_ID,
        SpanColumns.SOURCE_DOCUMENT_NAME,
    },
    "sentence": {
        SentAnnoColumns.CODE_ID_LIST_RECURSIVE,
        SentAnnoColumns.USER_ID,
        SentAnnoColumns.SOURCE_USER_ID,
        SentAnnoColumns.SOURCE_DOCUMENT_NAME,
    },
    "bbox": {
        BBoxColumns.CODE_ID_LIST_RECURSIVE,
        BBoxColumns.USER_ID,
        BBoxColumns.SOURCE_USER_ID,
        BBoxColumns.SOURCE_DOCUMENT_NAME,
    },
}


def _entity_ids(search_project, entity: str) -> set[int]:
    """Return the set of annotation ids for the given entity from the fixture."""
    _, _, key = ENTITY[entity]
    return {a.id for a in search_project[key]}


def _on_sdoc_one_indices(entity: str) -> set[int]:
    """Return the fixture indices of the annotations sitting on sdoc_one.

    Both spans are on sdoc_one; sentence/bbox are split one-per-sdoc (index 0 on
    sdoc_one, index 1 on sdoc_two).
    """
    return {"span": {0, 1}, "sentence": {0}, "bbox": {0}}[entity]


# ===========================================================================
# SEARCH MEMO INFO (/search/memo_info) TESTS
# ===========================================================================


def test_memo_info_marks_all_columns_except_content_groupable(
    client: TestClient, search_project
):
    """Memo info exposes every MemoColumns member; all but CONTENT are groupable."""
    response = client.post(
        "/search/memo_info", params={"project_id": search_project["project"].id}
    )
    assert response.status_code == 200, response.text
    infos = [ColumnInfo[MemoColumns].model_validate(x) for x in response.json()]
    groupable = {info.column for info in infos if info.groupable}
    # CONTENT is the only non-groupable memo column.
    assert groupable == set(MemoColumns) - {MemoColumns.CONTENT}


# ===========================================================================
# SEARCH MEMO (/search/memo) TESTS
# ===========================================================================


def _post_memo_query(
    client: TestClient, project_id: int, filter_tree: Filter
) -> set[str]:
    """POST /search/memo and return the set of matching memo titles."""
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
    return {m.title for m in Page[MemoRead].model_validate(response.json()).items}


# --- A. columns support their operators ------------------------------------------
# Each memo column declares an operator family (MemoColumns.get_filter_operator).
# The tests below verify that every column accepts all operators of its family
# and that they behave correctly against the deterministic fixture data.


@pytest.mark.parametrize(
    "filter_tree,expected_titles",
    [
        # No filter -> all memos.
        pytest.param(empty_filter(), ALL_MEMOS, id="no-filter"),
        # Every title contains "Memo".
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
        # Only "Code Memo" equals exactly.
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
        # NOT_EQUALS excludes only "Code Memo".
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
        # Only "Code Memo" starts with "Code".
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
        # Every title ends with "Memo".
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
def test_memo_search_title_column_supports_string_filter_operators(
    client: TestClient, search_project, filter_tree, expected_titles
):
    """TITLE supports all five string operators."""
    assert (
        _post_memo_query(client, search_project["project"].id, filter_tree)
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
def test_memo_search_content_column_supports_string_filter_operators(
    client: TestClient, search_project, filter_tree, expected_titles
):
    """CONTENT supports all five string operators."""
    assert (
        _post_memo_query(client, search_project["project"].id, filter_tree)
        == expected_titles
    )


@pytest.mark.parametrize(
    "filter_tree,expected_titles",
    [
        # EQUALS "code" -> only the memo on a code.
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1",
                        MemoColumns.ATTACHED_OBJECT_TYPE,
                        AttachedObjectTypeOperator.EQUALS,
                        "code",
                    )
                ]
            ),
            {"Code Memo"},
            id="attached-type-equals-code",
        ),
        # EQUALS "source_document" -> only the memo on a document.
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1",
                        MemoColumns.ATTACHED_OBJECT_TYPE,
                        AttachedObjectTypeOperator.EQUALS,
                        "source_document",
                    )
                ]
            ),
            {"Document Memo"},
            id="attached-type-equals-sdoc",
        ),
        # NOT_EQUALS "code" -> all but the code memo.
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1",
                        MemoColumns.ATTACHED_OBJECT_TYPE,
                        AttachedObjectTypeOperator.NOT_EQUALS,
                        "code",
                    )
                ]
            ),
            ALL_MEMOS - {"Code Memo"},
            id="attached-type-not-equals",
        ),
    ],
)
def test_memo_search_attached_object_type_column_supports_attached_to_operators(
    client: TestClient, search_project, filter_tree, expected_titles
):
    """ATTACHED_OBJECT_TYPE supports the ATTACHED_OBJECT_TYPE equals/not-equals operators."""
    assert (
        _post_memo_query(client, search_project["project"].id, filter_tree)
        == expected_titles
    )


@pytest.mark.parametrize(
    "filter_tree,expected_titles",
    [
        # Two expressions combined with AND -> only the memo matching both.
        pytest.param(
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1", MemoColumns.TITLE, StringOperator.CONTAINS, "Memo"
                    ),
                    make_filter_expr(
                        "e2",
                        MemoColumns.ATTACHED_OBJECT_TYPE,
                        AttachedObjectTypeOperator.EQUALS,
                        "code",
                    ),
                ]
            ),
            {"Code Memo"},
            id="and-combination",
        ),
        # Two expressions combined with OR -> memos matching either.
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
def test_memo_search_filter_expressions_combine_with_and_or_logic(
    client: TestClient, search_project, filter_tree, expected_titles
):
    """Filter trees combine expressions with AND/OR logic."""
    assert (
        _post_memo_query(client, search_project["project"].id, filter_tree)
        == expected_titles
    )


@pytest.mark.parametrize(
    "attached_type,expected_title",
    [
        pytest.param(attached_type, title, id=f"type-{attached_type}")
        for attached_type, title in MEMOS_BY_TYPE.items()
    ],
)
def test_memo_search_attached_object_type_filter_matches_each_type(
    client: TestClient, search_project, attached_type, expected_title
):
    """Filtering by each ATTACHED_OBJECT_TYPE returns exactly the memo of that type."""
    assert _post_memo_query(
        client,
        search_project["project"].id,
        make_filter_tree(
            [
                make_filter_expr(
                    "e1",
                    MemoColumns.ATTACHED_OBJECT_TYPE,
                    AttachedObjectTypeOperator.EQUALS,
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
def test_memo_search_user_id_column_supports_id_filter_operators(
    client: TestClient, search_project, operator, user_key, expected_titles
):
    """Memo USER_ID filter matches by authoring user."""
    user_id = search_project[user_key].id
    assert (
        _post_memo_query(
            client,
            search_project["project"].id,
            make_filter_tree(
                [make_filter_expr("e1", MemoColumns.USER_ID, operator, user_id)]
            ),
        )
        == expected_titles
    )


@pytest.mark.parametrize(
    "operator,object_type,object_key,expected_titles",
    [
        # EQUALS (code, code_alpha.id) -> only the memo on that code.
        pytest.param(
            AttachedObjectOperator.EQUALS,
            "code",
            "code_alpha",
            {"Code Memo"},
            id="code-equals",
        ),
        # NOT_EQUALS (code, code_alpha.id) -> all but the code memo.
        pytest.param(
            AttachedObjectOperator.NOT_EQUALS,
            "code",
            "code_alpha",
            ALL_MEMOS - {"Code Memo"},
            id="code-not-equals",
        ),
        # EQUALS (source_document, sdoc_one.id) -> only the document memo.
        pytest.param(
            AttachedObjectOperator.EQUALS,
            "source_document",
            "sdoc_one",
            {"Document Memo"},
            id="sdoc-equals",
        ),
        # EQUALS (tag, tag.id) -> only the tag memo.
        pytest.param(
            AttachedObjectOperator.EQUALS,
            "tag",
            "tag",
            {"Tag Memo"},
            id="tag-equals",
        ),
        # The same numeric id under a DIFFERENT type matches nothing: the pair
        # (source_document, code_alpha.id) does not exist, proving the type is
        # part of the comparison (a raw-id filter would have matched Code Memo).
        pytest.param(
            AttachedObjectOperator.EQUALS,
            "source_document",
            "code_alpha",
            set(),
            id="type-disambiguates-id",
        ),
    ],
)
def test_memo_search_attached_object_column_supports_attached_object_operators(
    client: TestClient,
    search_project,
    operator,
    object_type,
    object_key,
    expected_titles,
):
    """Memo ATTACHED_OBJECT filter matches by the (type, id) pair, not the raw id."""
    object_id = search_project[object_key].id
    assert (
        _post_memo_query(
            client,
            search_project["project"].id,
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1",
                        MemoColumns.ATTACHED_OBJECT_ID,
                        operator,
                        [object_type, str(object_id)],
                    )
                ]
            ),
        )
        == expected_titles
    )


# ===========================================================================
# ATTACHED_OBJECT ID/NAME RESOLUTION (export/import round-trip) TESTS
# ===========================================================================
#
# The ATTACHED_OBJECT column is polymorphic: its value is a [type, id] pair, so the
# generic resolve_ids/resolve_names hooks cannot know which table the id lives in.
# filtering.py therefore converts the AttachedObjectType token into a `Crud` member
# and passes it down as `types`, letting the memo column resolve the exact row.
# These tests pin that contract: a [type, id] filter must survive a full
# resolve_ids -> resolve_names round-trip unchanged, for every attachable type.


@pytest.mark.parametrize(
    "object_type,object_key",
    [
        # Each attachable type round-trips through its own display-name attribute.
        pytest.param(AttachedObjectType.code, "code_alpha", id="code"),
        pytest.param(AttachedObjectType.source_document, "sdoc_one", id="sdoc"),
        pytest.param(AttachedObjectType.tag, "tag", id="tag"),
        pytest.param(AttachedObjectType.project, "project", id="project"),
        # Annotations have no name; they round-trip by their stringified id.
        pytest.param(
            AttachedObjectType.span_annotation, "span_annotations", id="span-anno"
        ),
        pytest.param(
            AttachedObjectType.sentence_annotation,
            "sentence_annotations",
            id="sentence-anno",
        ),
        pytest.param(
            AttachedObjectType.bbox_annotation, "bbox_annotations", id="bbox-anno"
        ),
    ],
)
def test_memo_attached_object_resolve_round_trip_returns_original_pair(
    db_session, search_project, object_type, object_key
):
    """A [type, id] ATTACHED_OBJECT filter survives resolve_ids -> resolve_names."""
    target = search_project[object_key]
    # Annotation fixture values are lists; the named objects are single ORM rows.
    object_id = target[0].id if isinstance(target, list) else target.id

    original = make_filter_tree(
        [
            make_filter_expr(
                "e1",
                MemoColumns.ATTACHED_OBJECT_ID,
                AttachedObjectOperator.EQUALS,
                [object_type.value, str(object_id)],
            )
        ]
    )

    # Export direction: ids -> names (portable across projects).
    named = Filter.resolve_ids(original, db=db_session)
    # Import direction: names -> ids (in the target project).
    round_tripped = Filter.resolve_names(
        named, db=db_session, project_id=search_project["project"].id
    )

    expr = round_tripped.items[0]
    assert isinstance(expr, FilterExpression)
    assert expr.value == [object_type.value, str(object_id)]


def test_memo_attached_object_resolve_disambiguates_shared_id_across_types(
    db_session, search_project
):
    """A code and a tag sharing one id resolve to different names (type-aware).

    `colliding_tag` is a tag whose id equals `code_alpha.id` (see conftest). The
    two filters below differ only in the type token, which must steer each to its
    own table/name. This test only READS via Filter.resolve_ids.
    """
    code = search_project["code_alpha"]
    tag = search_project["colliding_tag"]
    assert tag.id == code.id  # the collision is a fixture precondition

    shared_id = code.id
    code_filter = make_filter_tree(
        [
            make_filter_expr(
                "e1",
                MemoColumns.ATTACHED_OBJECT_ID,
                AttachedObjectOperator.EQUALS,
                [AttachedObjectType.code.value, str(shared_id)],
            )
        ]
    )
    tag_filter = make_filter_tree(
        [
            make_filter_expr(
                "e1",
                MemoColumns.ATTACHED_OBJECT_ID,
                AttachedObjectOperator.EQUALS,
                [AttachedObjectType.tag.value, str(shared_id)],
            )
        ]
    )

    code_expr = Filter.resolve_ids(code_filter, db=db_session).items[0]
    tag_expr = Filter.resolve_ids(tag_filter, db=db_session).items[0]
    assert isinstance(code_expr, FilterExpression)
    assert isinstance(tag_expr, FilterExpression)
    code_named = code_expr.value
    tag_named = tag_expr.value
    assert isinstance(code_named, list) and isinstance(tag_named, list)

    # Same id, different type -> the resolved names must differ (code name vs tag
    # name), proving the resolution is type-aware rather than a probe-all-tables
    # first-match.
    assert code_named[0] == AttachedObjectType.code.value
    assert tag_named[0] == AttachedObjectType.tag.value
    assert code_named[1] == code.name
    assert tag_named[1] == tag.name


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
def test_memo_search_favorite_column_supports_boolean_filter_operators(
    client: TestClient, search_project, operator, value, expected_titles
):
    """Memo FAVORITE boolean filter (no favorites exist in the fixture)."""
    assert (
        _post_memo_query(
            client,
            search_project["project"].id,
            make_filter_tree(
                [make_filter_expr("e1", MemoColumns.FAVORITE, operator, value)]
            ),
        )
        == expected_titles
    )


# Memos created/updated yesterday (back-dated in the fixture).
YESTERDAY_MEMOS = {"Code Memo", "Span Memo", "BBox Memo"}
# Memos created/updated today.
TODAY_MEMOS = ALL_MEMOS - YESTERDAY_MEMOS


@pytest.mark.parametrize("date_column", [MemoColumns.CREATED, MemoColumns.UPDATED])
@pytest.mark.parametrize(
    "operator,day,expected",
    [
        # EQUALS today -> today's memos.
        pytest.param(DateOperator.EQUALS, "today", "today_set", id="equals-today"),
        # LT today -> only yesterday's memos.
        pytest.param(DateOperator.LT, "today", "yesterday_set", id="lt-today"),
        # LTE today -> all memos.
        pytest.param(DateOperator.LTE, "today", "all", id="lte-today"),
        # GT today -> none.
        pytest.param(DateOperator.GT, "today", "none", id="gt-today"),
        # GTE today -> today's memos.
        pytest.param(DateOperator.GTE, "today", "today_set", id="gte-today"),
        # EQUALS yesterday -> yesterday's memos.
        pytest.param(
            DateOperator.EQUALS, "yesterday", "yesterday_set", id="equals-yesterday"
        ),
        # LT yesterday -> none.
        pytest.param(DateOperator.LT, "yesterday", "none", id="lt-yesterday"),
        # LTE yesterday -> yesterday's memos.
        pytest.param(
            DateOperator.LTE, "yesterday", "yesterday_set", id="lte-yesterday"
        ),
        # GT yesterday -> today's memos.
        pytest.param(DateOperator.GT, "yesterday", "today_set", id="gt-yesterday"),
        # GTE yesterday -> all memos.
        pytest.param(DateOperator.GTE, "yesterday", "all", id="gte-yesterday"),
    ],
)
def test_memo_search_created_updated_columns_support_date_filter_operators(
    client: TestClient, search_project, date_column, operator, day, expected
):
    """CREATED and UPDATED support all five date operators, distinguished by day.

    The fixture back-dates the three test_user-authored memos (Code, Span, BBox)
    to yesterday, so the memo set is split across two days and each operator
    yields a distinct, deterministic result relative to both today and yesterday
    (unlike a single-day fixture, where LT/GT and LTE/GTE would be
    indistinguishable).
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
        _post_memo_query(
            client,
            project_id,
            make_filter_tree(
                [make_filter_expr("e1", date_column, operator, reference_day)]
            ),
        )
        == expected_titles
    )


# --- B. invalid filter input (HTTP 400 contracts) ----------------------------------
# Two kinds of malformed filter input, both surfaced as HTTP 400:
#   1. wrong-typed/malformed values: Pydantic only checks that `value` is a
#      bool/str/int/list, not that its type matches the operator, so the value
#      reaches `*Operator.apply()`, which raises InvalidFilterValueError (or
#      InvalidFilterValueFormatError) -> 400.
#   2. operator/column family mismatch: the FilterExpression model_validator
#      rejects an operator whose family differs from the column's declared
#      family (OperatorNotCompatibleWithColumnError) -> 400. Metadata (int)
#      columns are NOT validated (their family needs a DB lookup), so only
#      enum columns are tested.


@pytest.mark.parametrize(
    "column,operator,value,match",
    [
        # StringOperator rejects a non-str value.
        pytest.param(
            MemoColumns.TITLE,
            StringOperator.EQUALS,
            123,
            r"Invalid value type for StringOperator \(requires str\)",
            id="title-string-non-str",
        ),
        # StringOperator rejects a non-str value.
        pytest.param(
            MemoColumns.CONTENT,
            StringOperator.CONTAINS,
            123,
            r"Invalid value type for StringOperator \(requires str\)",
            id="content-string-non-str",
        ),
        # IDOperator rejects a list value.
        pytest.param(
            MemoColumns.USER_ID,
            IDOperator.EQUALS,
            ["invalid"],
            r"Invalid value type for IDOperator \(requires int or str\)",
            id="user-id-non-int-str",
        ),
        # AttachedObjectOperator rejects a non-pair value.
        pytest.param(
            MemoColumns.ATTACHED_OBJECT_ID,
            AttachedObjectOperator.EQUALS,
            "invalid",
            r"Invalid value type for AttachedObjectOperator \(requires list\[str\] of \[type, id\]\)",
            id="attached-object-non-pair",
        ),
        # AttachedObjectOperator rejects an unknown AttachedObjectType in the pair.
        pytest.param(
            MemoColumns.ATTACHED_OBJECT_ID,
            AttachedObjectOperator.EQUALS,
            ["bogus", "1"],
            r"is not a valid AttachedObjectType",
            id="attached-object-invalid-type",
        ),
        # AttachedObjectOperator rejects a non-integer id in the pair.
        pytest.param(
            MemoColumns.ATTACHED_OBJECT_ID,
            AttachedObjectOperator.EQUALS,
            ["code", "not-an-int"],
            r"is not an integer id",
            id="attached-object-non-int-id",
        ),
        # AttachedObjectTypeOperator rejects a non-str value.
        pytest.param(
            MemoColumns.ATTACHED_OBJECT_TYPE,
            AttachedObjectTypeOperator.EQUALS,
            123,
            r"Invalid value type for AttachedObjectTypeOperator \(requires str\)",
            id="attached-to-non-str",
        ),
        # AttachedObjectTypeOperator rejects an unknown AttachedObjectType value.
        pytest.param(
            MemoColumns.ATTACHED_OBJECT_TYPE,
            AttachedObjectTypeOperator.EQUALS,
            "bogus",
            r"is not a valid AttachedObjectType",
            id="attached-to-invalid-enum-value",
        ),
        # DateOperator rejects a non-str value.
        pytest.param(
            MemoColumns.CREATED,
            DateOperator.EQUALS,
            123,
            r"Invalid value type for DateOperator \(requires str\)",
            id="created-date-non-str",
        ),
        # DateOperator rejects an unparseable date string.
        pytest.param(
            MemoColumns.CREATED,
            DateOperator.EQUALS,
            "not-a-date",
            r"Invalid date format",
            id="created-date-unparseable",
        ),
        # DateOperator rejects a non-str value.
        pytest.param(
            MemoColumns.UPDATED,
            DateOperator.EQUALS,
            123,
            r"Invalid value type for DateOperator \(requires str\)",
            id="updated-date-non-str",
        ),
        # DateOperator rejects an unparseable date string.
        pytest.param(
            MemoColumns.UPDATED,
            DateOperator.EQUALS,
            "not-a-date",
            r"Invalid date format",
            id="updated-date-unparseable",
        ),
        # BooleanOperator rejects a non-bool value.
        pytest.param(
            MemoColumns.FAVORITE,
            BooleanOperator.EQUALS,
            "yes",
            r"Invalid value type for BooleanOperator \(requires bool\)",
            id="favorite-bool-non-bool",
        ),
    ],
)
def test_memo_search_rejects_wrong_typed_filter_values_with_400(
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


@pytest.mark.parametrize(
    "column,operator,value",
    [
        # TITLE is a STRING column; a DATE operator mismatches.
        pytest.param(
            MemoColumns.TITLE,
            DateOperator.EQUALS,
            "2024-01-01",
            id="title-string-with-date-op",
        ),
        # TITLE is a STRING column; a BOOLEAN operator mismatches.
        pytest.param(
            MemoColumns.TITLE,
            BooleanOperator.EQUALS,
            True,
            id="title-string-with-bool-op",
        ),
        # USER_ID is an ID column; a STRING operator mismatches.
        pytest.param(
            MemoColumns.USER_ID,
            StringOperator.CONTAINS,
            "1",
            id="user-id-with-string-op",
        ),
        # ATTACHED_OBJECT_TYPE is an ATTACHED_OBJECT_TYPE column; an ID operator mismatches.
        pytest.param(
            MemoColumns.ATTACHED_OBJECT_TYPE,
            IDOperator.EQUALS,
            1,
            id="attached-type-with-id-op",
        ),
        # ATTACHED_OBJECT is an ATTACHED_OBJECT column; an ID operator mismatches.
        pytest.param(
            MemoColumns.ATTACHED_OBJECT_ID,
            IDOperator.EQUALS,
            1,
            id="attached-object-with-id-op",
        ),
        # CREATED is a DATE column; a STRING operator mismatches.
        pytest.param(
            MemoColumns.CREATED,
            StringOperator.EQUALS,
            "2024-01-01",
            id="created-date-with-string-op",
        ),
        # FAVORITE is a BOOLEAN column; a STRING operator mismatches.
        pytest.param(
            MemoColumns.FAVORITE,
            StringOperator.EQUALS,
            "true",
            id="favorite-bool-with-string-op",
        ),
    ],
)
def test_memo_search_rejects_operator_column_family_mismatch_with_400(
    client: TestClient, search_project, column, operator, value
):
    """An operator whose family mismatches the column's family is rejected (400)."""
    payload = {
        "project_id": search_project["project"].id,
        "search_query": "",
        "filter": {
            "id": "root",
            "logic_operator": "and",
            "items": [
                {
                    "id": "e1",
                    "column": column.value if hasattr(column, "value") else column,
                    "operator": (
                        operator.value if hasattr(operator, "value") else operator
                    ),
                    "value": value,
                }
            ],
        },
        "sorts": [],
        "page_number": 0,
        "page_size": 20,
    }
    response = client.post("/search/memo", json=payload)
    assert response.status_code == 400, response.text
    assert "not compatible with column" in response.text


# --- C. full-text search & pagination ---------------------------------------------


def test_memo_search_full_text_query_matches_title_and_content(
    client: TestClient, search_project
):
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
    page = Page[MemoRead].model_validate(response.json())
    # "Document Memo" title and "A memo on the first document" content both match.
    assert {m.title for m in page.items} == {"Document Memo"}


def test_memo_search_paginates_rows_without_overlap(client: TestClient, search_project):
    """Memo row query paginates deterministically (default sort: updated desc)."""

    def _page(page_number: int) -> Page[MemoRead]:
        request = QueryRequest[MemoColumns](
            project_id=search_project["project"].id,
            search_query="",
            filter=empty_filter(),
            sorts=[],
            page_number=page_number,
            page_size=2,
        )
        return Page[MemoRead].model_validate(
            client.post("/search/memo", json=request.model_dump(mode="json")).json()
        )

    page0 = _page(0)
    page1 = _page(1)
    assert page0.total_results == 7
    assert len(page0.items) == 2
    assert len(page1.items) == 2
    # No overlap between pages.
    assert {m.id for m in page0.items}.isdisjoint({m.id for m in page1.items})


# --- D. drill-down (group_by + group_key) ------------------------------------------
# A row query that sets BOTH group_by and group_key is restricted to the single
# group identified by group_key (exprs.key == group_key). Setting only one of
# group_by or group_key is rejected (422) by QueryRequest validation.


def _post_memo_drill_down_query(
    client: TestClient,
    project_id: int,
    group_by: GroupConfig | None,
    group_key: str | None,
) -> Page[MemoRead]:
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
    return Page[MemoRead].model_validate(response.json())


@pytest.mark.parametrize(
    "group_key,expected_titles",
    [
        # Drill into the "code" group -> only the code memo.
        pytest.param("code", {"Code Memo"}, id="code"),
        # Drill into the "source_document" group -> only the document memo.
        pytest.param("source_document", {"Document Memo"}, id="source-document"),
        # Drill into the "tag" group -> only the tag memo.
        pytest.param("tag", {"Tag Memo"}, id="tag"),
    ],
)
def test_memo_drill_down_into_attached_object_type_group_returns_only_that_group(
    client: TestClient, search_project, group_key, expected_titles
):
    """Drilling into an attached-object-type group returns only that group's rows."""
    page = _post_memo_drill_down_query(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_TYPE),
        group_key,
    )
    assert page.total_results == len(expected_titles)
    assert {m.title for m in page.items} == expected_titles


def test_memo_drill_down_into_attached_object_group_returns_only_that_object(
    client: TestClient, search_project
):
    """Drilling into a specific attached-object group (composite "type:id" key)
    returns only the memo attached to that exact object."""
    code = search_project["code_alpha"]
    page = _post_memo_drill_down_query(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_ID),
        f"code:{code.id}",
    )
    assert page.total_results == 1
    assert {m.title for m in page.items} == {"Code Memo"}


def test_memo_drill_down_into_user_group_returns_only_that_authors_memos(
    client: TestClient, search_project
):
    """Drilling into an author group returns only that author's memos."""
    page = _post_memo_drill_down_query(
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


def test_memo_drill_down_into_favorite_group_returns_all_memos(
    client: TestClient, search_project
):
    """Drilling into the (only) favorite bucket returns all memos."""
    page = _post_memo_drill_down_query(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.FAVORITE),
        "false",
    )
    assert page.total_results == 7
    assert {m.title for m in page.items} == ALL_MEMOS


def test_memo_drill_down_into_day_bucket_returns_only_that_days_memos(
    client: TestClient, search_project
):
    """Drilling into a DAY date bucket returns only that day's memos.

    This mirrors the real two-request flow: fetch the DAY groups, then drill into
    the older (yesterday) bucket using the key the groups endpoint returned. This
    avoids hardcoding PostgreSQL's timestamp-cast string format.
    """
    project_id = search_project["project"].id
    group_config = GroupConfig(
        field=MemoColumns.CREATED, date_granularity=DateGranularity.DAY
    )
    groups = _post_memo_group_query(client, project_id, group_config)
    # Two day-buckets, newest first: [today (4), yesterday (3)].
    assert [g.total_results for g in groups.items] == [4, 3]
    yesterday_key = groups.items[1].key

    page = _post_memo_drill_down_query(client, project_id, group_config, yesterday_key)
    assert {m.title for m in page.items} == YESTERDAY_MEMOS


def test_memo_drill_down_with_nonexistent_group_key_returns_empty_page(
    client: TestClient, search_project
):
    """A group_key matching no group yields an empty page."""
    page = _post_memo_drill_down_query(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_TYPE),
        "no-such-group",
    )
    assert page.items == []
    assert page.total_results == 0


def test_memo_drill_down_group_by_without_group_key_rejected_with_422(
    client: TestClient, search_project
):
    """group_by alone (no group_key) is rejected with HTTP 422."""
    payload = {
        "project_id": search_project["project"].id,
        "search_query": "",
        "filter": empty_filter().model_dump(mode="json"),
        "sorts": [],
        "group_by": {"field": MemoColumns.ATTACHED_OBJECT_TYPE.value},
        "group_key": None,
        "page_number": 0,
        "page_size": 20,
    }
    response = client.post("/search/memo", json=payload)
    assert response.status_code == 422, response.text
    assert "Both 'group_by' and 'group_key' must be provided together" in response.text


def test_memo_drill_down_group_key_without_group_by_rejected_with_422(
    client: TestClient, search_project
):
    """group_key alone (no group_by) is rejected with HTTP 422."""
    payload = {
        "project_id": search_project["project"].id,
        "search_query": "",
        "filter": empty_filter().model_dump(mode="json"),
        "sorts": [],
        "group_by": None,
        "group_key": "code",
        "page_number": 0,
        "page_size": 20,
    }
    response = client.post("/search/memo", json=payload)
    assert response.status_code == 422, response.text
    assert "Both 'group_by' and 'group_key' must be provided together" in response.text


def test_memo_drill_down_into_non_groupable_column_rejected_with_400(
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


# ===========================================================================
# SEARCH MEMO GROUPS (/search/memo/groups) TESTS
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


def _post_memo_group_query(
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


# --- A. one bucket per column value ----------------------------------------------


def test_memo_group_by_attached_object_type_yields_one_bucket_per_type(
    client: TestClient, search_project
):
    """Grouping by attached_object_type yields one bucket per type with counts."""
    page = _post_memo_group_query(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_TYPE),
    )
    counts = {g.key: g.total_results for g in page.items}
    # One memo per attached-object type.
    assert counts == {attached_type: 1 for attached_type in MEMOS_BY_TYPE}
    assert page.total_results == len(MEMOS_BY_TYPE)


def test_memo_group_by_user_id_yields_one_bucket_per_author(
    client: TestClient, search_project
):
    """Grouping by author yields one bucket per authoring user."""
    page = _post_memo_group_query(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.USER_ID),
    )
    # user authored 4 memos (Code, Span, BBox, Tag); other_user authored 3.
    counts = {g.label: g.total_results for g in page.items}
    assert counts == {"Test User": 4, "Other Author": 3}
    assert page.total_results == 2


def test_memo_group_by_title_buckets_by_first_letter(
    client: TestClient, search_project
):
    """Grouping by title buckets memos by their first letter (A-Z)."""
    page = _post_memo_group_query(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.TITLE),
    )
    # First letters: C(ode), D(ocument), S(pan), S(entence), B(Box), P(roject), T(ag).
    counts = {g.key: g.total_results for g in page.items}
    assert counts == {"C": 1, "D": 1, "S": 2, "B": 1, "P": 1, "T": 1}
    assert page.total_results == 6


def test_memo_group_by_attached_object_sets_drill_down_target(
    client: TestClient, search_project
):
    """Grouping by attached_object yields one bucket per object with a target."""
    page = _post_memo_group_query(
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


def test_memo_group_by_favorite_yields_single_not_favorites_bucket(
    client: TestClient, search_project
):
    """Grouping by favorite yields a single 'Not favorites' bucket (none exist)."""
    page = _post_memo_group_query(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.FAVORITE),
    )
    assert page.total_results == 1
    group = page.items[0]
    assert group.key == "false"
    assert group.label == "Not favorites"
    assert group.total_results == 7


@pytest.mark.parametrize("date_column", [MemoColumns.CREATED, MemoColumns.UPDATED])
@pytest.mark.parametrize(
    "granularity",
    [
        # DAY buckets: yesterday (3) and today (4) are separate days.
        pytest.param(DateGranularity.DAY, id="day"),
        # WEEK buckets: one bucket if both days share a week, else two.
        pytest.param(DateGranularity.WEEK, id="week"),
        # MONTH buckets: one bucket if both days share a month, else two.
        pytest.param(DateGranularity.MONTH, id="month"),
        # YEAR buckets: one bucket if both days share a year, else two.
        pytest.param(DateGranularity.YEAR, id="year"),
        # No granularity -> defaults to MONTH.
        pytest.param(None, id="default-month"),
    ],
)
def test_memo_group_by_date_column_respects_granularity(
    client: TestClient, search_project, date_column, granularity
):
    """CREATED/UPDATED group into date buckets sized by the granularity."""
    page = _post_memo_group_query(
        client,
        search_project["project"].id,
        GroupConfig(field=date_column, date_granularity=granularity),
    )
    yesterday = search_project["memos"][0].created
    today = search_project["memos"][1].created

    match granularity:
        case DateGranularity.DAY:
            expected_counts = sorted([3, 4])
        case DateGranularity.WEEK:
            same_week = yesterday.isocalendar()[:2] == today.isocalendar()[:2]
            expected_counts = [7] if same_week else sorted([3, 4])
        case DateGranularity.MONTH | None:
            same_month = (yesterday.year, yesterday.month) == (
                today.year,
                today.month,
            )
            expected_counts = [7] if same_month else sorted([3, 4])
        case DateGranularity.YEAR:
            same_year = yesterday.year == today.year
            expected_counts = [7] if same_year else sorted([3, 4])
        case _:
            raise AssertionError(f"Unhandled granularity: {granularity}")

    assert sorted(g.total_results for g in page.items) == expected_counts
    assert page.total_results == len(expected_counts)


# --- B. group labels & ordering ----------------------------------------------------


def test_memo_group_attached_object_type_labels_replace_underscores(
    client: TestClient, search_project
):
    """ATTACHED_OBJECT_TYPE group labels replace underscores with spaces."""
    page = _post_memo_group_query(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_TYPE),
    )
    labels = {g.key: g.label for g in page.items}
    assert labels["source_document"] == "source document"
    assert labels["span_annotation"] == "span annotation"
    assert labels["code"] == "code"


def test_memo_groups_are_sorted_alphabetically_by_label(
    client: TestClient, search_project
):
    """Non-date groups are ordered alphabetically by label."""
    page = _post_memo_group_query(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_TYPE),
    )
    labels = [g.label for g in page.items]
    assert labels == sorted(labels)


def test_memo_group_date_buckets_sorted_newest_first(
    client: TestClient, search_project
):
    """Date groups are ordered newest bucket first."""
    page = _post_memo_group_query(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.CREATED, date_granularity=DateGranularity.DAY),
    )
    assert page.total_results == 2
    # Newest (today, 4 memos) comes before yesterday (3 memos).
    assert [g.total_results for g in page.items] == [4, 3]
    assert page.items[0].key > page.items[1].key


# --- C. filter / search query are applied before grouping --------------------------


def test_memo_group_query_applies_filter_before_grouping(
    client: TestClient, search_project
):
    """A filter is applied before grouping: only matching rows are bucketed."""
    page = _post_memo_group_query(
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


def test_memo_group_query_applies_search_query_before_grouping(
    client: TestClient, search_project
):
    """A full-text search query is applied before grouping."""
    page = _post_memo_group_query(
        client,
        search_project["project"].id,
        GroupConfig(field=MemoColumns.ATTACHED_OBJECT_TYPE),
        search_query="document",
    )
    # Only "Document Memo" matches -> a single source_document bucket.
    assert page.total_results == 1
    assert page.items[0].key == "source_document"
    assert page.items[0].total_results == 1


# --- D. pagination over groups ------------------------------------------------------


def test_memo_group_query_paginates_groups_without_overlap(
    client: TestClient, search_project
):
    """Group queries paginate over groups (not rows)."""

    def _page(page_number: int) -> GroupPage:
        return _post_memo_group_query(
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


# --- E. errors & edge cases ---------------------------------------------------------


def test_memo_group_by_non_groupable_column_rejected_with_400(
    client: TestClient, search_project
):
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


def test_memo_group_query_with_filter_matching_nothing_returns_no_groups(
    client: TestClient, search_project
):
    """A filter matching nothing yields zero groups."""
    page = _post_memo_group_query(
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
# INFO ENDPOINTS (/search/*_annotation_info)
# ===========================================================================


@pytest.mark.parametrize(
    "entity,info_url",
    [
        pytest.param("span", SPAN_INFO_URL, id="span"),
        pytest.param("sentence", SENT_INFO_URL, id="sentence"),
        pytest.param("bbox", BBOX_INFO_URL, id="bbox"),
    ],
)
def test_annotation_info_marks_exactly_the_documented_columns_groupable(
    client: TestClient, search_project, entity, info_url
):
    """Annotation info marks exactly the documented columns as groupable."""
    _, columns_enum, _ = ENTITY[entity]
    response = client.post(
        info_url, params={"project_id": search_project["project"].id}
    )
    assert response.status_code == 200, response.text
    infos = [ColumnInfo[columns_enum].model_validate(x) for x in response.json()]
    groupable = {info.column for info in infos if info.groupable}
    assert groupable == GROUPABLE[entity]


# ===========================================================================
# ROW QUERIES (/search/*_annotation)
# ===========================================================================


def _post_annotation_query(
    client: TestClient,
    url: str,
    row_model,
    project_id: int,
    filter_tree: Filter,
    search_query: str = "",
    sorts: list | None = None,
    group_by: GroupConfig | None = None,
    group_key: str | None = None,
    page_number: int = 0,
    page_size: int = 20,
):
    """POST an annotation row query and return the validated Page."""
    request = QueryRequest(
        project_id=project_id,
        search_query=search_query,
        filter=filter_tree,
        sorts=sorts if sorts is not None else [],
        group_by=group_by,
        group_key=group_key,
        page_number=page_number,
        page_size=page_size,
    )
    response = client.post(url, json=request.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    return Page[row_model].model_validate(response.json())


def _annotation_ids(
    client: TestClient, url: str, row_model, project_id: int, filter_tree: Filter
) -> set[int]:
    """POST an annotation row query and return the set of matching annotation ids."""
    page = _post_annotation_query(client, url, row_model, project_id, filter_tree)
    return {row.id for row in page.items}


# --- A. columns support their operators ------------------------------------------
# Each annotation column declares an operator family (get_filter_operator). The
# tests below verify that every column accepts the operators of its family and
# that they behave correctly against the deterministic fixture data.


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
def test_annotation_rows_no_filter_returns_all_annotations(
    client: TestClient, search_project, entity, url
):
    """With no filter, each annotation row query returns all annotations of that type."""
    row_model, _, _ = ENTITY[entity]
    page = _post_annotation_query(
        client, url, row_model, search_project["project"].id, empty_filter()
    )
    assert page.total_results == 2
    assert {row.id for row in page.items} == _entity_ids(search_project, entity)


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
@pytest.mark.parametrize(
    "operator,code_key,expected_indices",
    [
        # CONTAINS code Alpha -> only the Alpha-coded annotation (index 0).
        pytest.param(
            IDListRecursiveOperator.CONTAINS, "code_alpha", {0}, id="contains-alpha"
        ),
        # CONTAINS code Beta -> only the Beta-coded annotation (index 1).
        pytest.param(
            IDListRecursiveOperator.CONTAINS, "code_beta", {1}, id="contains-beta"
        ),
        # NOT_CONTAINS code Alpha -> only the Beta-coded annotation.
        pytest.param(
            IDListRecursiveOperator.NOT_CONTAINS,
            "code_alpha",
            {1},
            id="not-contains-alpha",
        ),
        # NOT_CONTAINS code Beta -> only the Alpha-coded annotation.
        pytest.param(
            IDListRecursiveOperator.NOT_CONTAINS,
            "code_beta",
            {0},
            id="not-contains-beta",
        ),
        # CONTAINS_RECURSIVE on Alpha expands to Alpha + its child Beta -> both
        # annotations (this is the case that distinguishes it from plain CONTAINS).
        pytest.param(
            IDListRecursiveOperator.CONTAINS_RECURSIVE,
            "code_alpha",
            {0, 1},
            id="contains-recursive-alpha",
        ),
        # CONTAINS_RECURSIVE on the child Beta expands to just Beta (no children).
        pytest.param(
            IDListRecursiveOperator.CONTAINS_RECURSIVE,
            "code_beta",
            {1},
            id="contains-recursive-beta",
        ),
    ],
)
def test_annotation_rows_code_column_supports_id_list_recursive_operators(
    client: TestClient,
    search_project,
    entity,
    url,
    operator,
    code_key,
    expected_indices,
):
    """CODE_ID_LIST_RECURSIVE supports the ID_LIST_RECURSIVE operators.

    The subquery is grouped per annotation, so the aggregate is a single-element
    [code_id] array per row. CONTAINS_RECURSIVE expands the filter value through
    the code hierarchy: the fixture makes Beta a child of Alpha, so recursing
    from Alpha matches both Alpha- and Beta-coded annotations.
    """
    row_model, columns_enum, key = ENTITY[entity]
    code_id = search_project[code_key].id
    annotations = search_project[key]
    expected_ids = {annotations[i].id for i in expected_indices}
    assert (
        _annotation_ids(
            client,
            url,
            row_model,
            search_project["project"].id,
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1",
                        columns_enum.CODE_ID_LIST_RECURSIVE,
                        operator,
                        code_id,
                    )
                ]
            ),
        )
        == expected_ids
    )


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
@pytest.mark.parametrize(
    "operator,tag_key,expected_location",
    [
        # CONTAINS "Important" -> annotations on sdoc_one (linked to "Important").
        pytest.param(
            IDListRecursiveOperator.CONTAINS, "tag", "on_sdoc_one", id="contains-tag"
        ),
        # NOT_CONTAINS "Important" -> annotations on sdoc_two (tagged "Urgent").
        pytest.param(
            IDListRecursiveOperator.NOT_CONTAINS,
            "tag",
            "on_sdoc_two",
            id="not-contains-tag",
        ),
        # CONTAINS_RECURSIVE on "Important" expands to {Important, Urgent} (its
        # child) -> matches annotations on BOTH sdocs. This distinguishes it from
        # plain CONTAINS.
        pytest.param(
            IDListRecursiveOperator.CONTAINS_RECURSIVE,
            "tag",
            "all",
            id="contains-recursive-parent-tag",
        ),
        # CONTAINS_RECURSIVE on the child "Urgent" (no children) -> only sdoc_two.
        pytest.param(
            IDListRecursiveOperator.CONTAINS_RECURSIVE,
            "subtag",
            "on_sdoc_two",
            id="contains-recursive-child-tag",
        ),
    ],
)
def test_annotation_rows_tag_column_supports_id_list_recursive_operators(
    client: TestClient,
    search_project,
    entity,
    url,
    operator,
    tag_key,
    expected_location,
):
    """TAG_ID_LIST_RECURSIVE supports the ID_LIST_RECURSIVE operators.

    The TAG aggregate collects the tags of the annotation's sdoc: annotations on
    sdoc_one contain tag "Important"; annotations on sdoc_two contain subtag
    "Urgent" (a child of "Important"). CONTAINS_RECURSIVE on "Important" expands
    through the hierarchy to {Important, Urgent}, matching both sdocs.
    """
    row_model, columns_enum, key = ENTITY[entity]
    tag_id = search_project[tag_key].id
    annotations = search_project[key]
    on_sdoc_one = _on_sdoc_one_indices(entity)
    all_indices = set(range(len(annotations)))
    indices = {
        "on_sdoc_one": on_sdoc_one,
        "on_sdoc_two": all_indices - on_sdoc_one,
        "all": all_indices,
    }[expected_location]
    expected_ids = {annotations[i].id for i in indices}
    assert (
        _annotation_ids(
            client,
            url,
            row_model,
            search_project["project"].id,
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1",
                        columns_enum.TAG_ID_LIST_RECURSIVE,
                        operator,
                        tag_id,
                    )
                ]
            ),
        )
        == expected_ids
    )


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
@pytest.mark.parametrize(
    "operator,folder_key,expected_location",
    [
        # CONTAINS "Archive" (sdoc_two's direct NORMAL parent) -> sdoc_two's annotations.
        pytest.param(
            IDListRecursiveOperator.CONTAINS,
            "subfolder",
            "on_sdoc_two",
            id="contains-subfolder",
        ),
        # CONTAINS "Research" matches nothing: sdoc_two's direct parent is the
        # child "Archive", not "Research" itself.
        pytest.param(
            IDListRecursiveOperator.CONTAINS, "folder", "none", id="contains-folder"
        ),
        # NOT_CONTAINS "Archive" -> annotations on sdoc_one (no NORMAL folder).
        pytest.param(
            IDListRecursiveOperator.NOT_CONTAINS,
            "subfolder",
            "on_sdoc_one",
            id="not-contains-subfolder",
        ),
        # CONTAINS_RECURSIVE on "Research" expands to {Research, Archive} (its
        # child) -> matches sdoc_two's annotations. This distinguishes it from
        # plain CONTAINS on "Research" (which matches nothing).
        pytest.param(
            IDListRecursiveOperator.CONTAINS_RECURSIVE,
            "folder",
            "on_sdoc_two",
            id="contains-recursive-parent-folder",
        ),
        # CONTAINS_RECURSIVE on the child "Archive" (no children) -> sdoc_two.
        pytest.param(
            IDListRecursiveOperator.CONTAINS_RECURSIVE,
            "subfolder",
            "on_sdoc_two",
            id="contains-recursive-child-folder",
        ),
    ],
)
def test_annotation_rows_folder_column_supports_id_list_recursive_operators(
    client: TestClient,
    search_project,
    entity,
    url,
    operator,
    folder_key,
    expected_location,
):
    """FOLDER_ID_LIST_RECURSIVE supports the ID_LIST_RECURSIVE operators.

    The FOLDER aggregate exposes the NORMAL parent folder of the annotation's
    sdoc. sdoc_two sits in "Archive" (a child of "Research"), so its annotations
    contain "Archive" directly; "Research" only matches via CONTAINS_RECURSIVE.
    sdoc_one's annotations have no NORMAL folder.
    """
    row_model, columns_enum, key = ENTITY[entity]
    folder_id = search_project[folder_key].id
    annotations = search_project[key]
    on_sdoc_one = _on_sdoc_one_indices(entity)
    all_indices = set(range(len(annotations)))
    indices = {
        "on_sdoc_one": on_sdoc_one,
        "on_sdoc_two": all_indices - on_sdoc_one,
        "none": set(),
    }[expected_location]
    expected_ids = {annotations[i].id for i in indices}
    assert (
        _annotation_ids(
            client,
            url,
            row_model,
            search_project["project"].id,
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1",
                        columns_enum.FOLDER_ID_LIST_RECURSIVE,
                        operator,
                        folder_id,
                    )
                ]
            ),
        )
        == expected_ids
    )


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
@pytest.mark.parametrize(
    "operator,value,expected_location",
    [
        # EQUALS sdoc_one's name -> annotations on sdoc_one.
        pytest.param(
            StringOperator.EQUALS, "sdoc_one", "on_sdoc_one", id="equals-sdoc-one"
        ),
        # NOT_EQUALS sdoc_one's name -> annotations on sdoc_two.
        pytest.param(
            StringOperator.NOT_EQUALS,
            "sdoc_one",
            "on_sdoc_two",
            id="not-equals-sdoc-one",
        ),
        # CONTAINS "Document" matches both sdoc names -> all annotations.
        pytest.param(
            StringOperator.CONTAINS, "Document", "all", id="contains-document"
        ),
        # STARTS_WITH "Test" -> only sdoc_one ("Test Document").
        pytest.param(
            StringOperator.STARTS_WITH, "Test", "on_sdoc_one", id="starts-with-test"
        ),
        # ENDS_WITH "Document" matches both names -> all annotations.
        pytest.param(
            StringOperator.ENDS_WITH, "Document", "all", id="ends-with-document"
        ),
    ],
)
def test_annotation_rows_source_document_name_column_supports_string_operators(
    client: TestClient,
    search_project,
    entity,
    url,
    operator,
    value,
    expected_location,
):
    """SOURCE_DOCUMENT_NAME supports all five string operators."""
    row_model, columns_enum, key = ENTITY[entity]
    annotations = search_project[key]
    on_sdoc_one = _on_sdoc_one_indices(entity)
    all_indices = set(range(len(annotations)))
    indices = {
        "on_sdoc_one": on_sdoc_one,
        "on_sdoc_two": all_indices - on_sdoc_one,
        "all": all_indices,
    }[expected_location]
    expected_ids = {annotations[i].id for i in indices}
    filter_value = search_project["sdoc_one"].name if value == "sdoc_one" else value
    assert (
        _annotation_ids(
            client,
            url,
            row_model,
            search_project["project"].id,
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1",
                        columns_enum.SOURCE_DOCUMENT_NAME,
                        operator,
                        filter_value,
                    )
                ]
            ),
        )
        == expected_ids
    )


# Author distribution per entity: span/sentence are split one-per-user (index 0
# by test_user, index 1 by other_user); BOTH bbox annotations are by test_user.
_USER_INDICES = {
    "span": {"user": {0}, "other_user": {1}},
    "sentence": {"user": {0}, "other_user": {1}},
    "bbox": {"user": {0, 1}, "other_user": set()},
}


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
@pytest.mark.parametrize(
    "operator,user_key",
    [
        # EQUALS the authoring user.
        pytest.param(IDOperator.EQUALS, "user", id="equals-user"),
        # EQUALS the other user.
        pytest.param(IDOperator.EQUALS, "other_user", id="equals-other-user"),
        # NOT_EQUALS the authoring user.
        pytest.param(IDOperator.NOT_EQUALS, "user", id="not-equals-user"),
    ],
)
def test_annotation_rows_user_id_column_supports_id_operators(
    client: TestClient,
    search_project,
    entity,
    url,
    operator,
    user_key,
):
    """USER_ID supports the ID equals/not-equals operators.

    span/sentence are authored one-per-user; both bbox annotations are authored
    by test_user, so bbox's other_user cases match nothing.
    """
    row_model, columns_enum, key = ENTITY[entity]
    user_id = search_project[user_key].id
    annotations = search_project[key]
    matching = _USER_INDICES[entity][user_key]
    expected_indices = (
        matching
        if operator == IDOperator.EQUALS
        else set(range(len(annotations))) - matching
    )
    expected_ids = {annotations[i].id for i in expected_indices}
    assert (
        _annotation_ids(
            client,
            url,
            row_model,
            search_project["project"].id,
            make_filter_tree(
                [make_filter_expr("e1", columns_enum.USER_ID, operator, user_id)]
            ),
        )
        == expected_ids
    )


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
@pytest.mark.parametrize(
    "operator,value,expected_indices",
    [
        # Only index 0 has a memo attached; its content is "A memo on a ... annotation".
        pytest.param(
            StringOperator.CONTAINS, "memo on a", {0}, id="contains-memo-on-a"
        ),
        # EQUALS the exact memo content -> only index 0.
        pytest.param(
            StringOperator.EQUALS,
            "memo_content",
            {0},
            id="equals-memo-content",
        ),
        # NULL memo rows match NO string operator, not even NOT_EQUALS. The filter
        # value must differ from index 0's memo content so index 0 (which HAS a
        # memo) matches while the NULL index 1 does not -> {0}.
        pytest.param(
            StringOperator.NOT_EQUALS,
            "A memo on something else entirely",
            {0},
            id="not-equals-memo-content",
        ),
    ],
)
def test_annotation_rows_memo_content_column_supports_string_operators(
    client: TestClient, search_project, entity, url, operator, value, expected_indices
):
    """MEMO_CONTENT supports string operators; NULL memo rows match no operator.

    Only the first annotation of each type has a memo attached. For all other
    annotations the memo column is NULL, and NULL rows match NO string operator —
    not even negative ones like NOT_EQUALS/NOT_CONTAINS.
    """
    row_model, columns_enum, key = ENTITY[entity]
    annotations = search_project[key]
    # The memo attached to the first annotation of each type, per the fixture.
    memo_index = {"span": 2, "sentence": 3, "bbox": 4}[entity]
    memo_content = search_project["memos"][memo_index].content
    filter_value = memo_content if value == "memo_content" else value
    expected_ids = {annotations[i].id for i in expected_indices}
    assert (
        _annotation_ids(
            client,
            url,
            row_model,
            search_project["project"].id,
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1",
                        columns_enum.MEMO_CONTENT,
                        operator,
                        filter_value,
                    )
                ]
            ),
        )
        == expected_ids
    )


@pytest.mark.parametrize(
    "operator,value,expected_texts",
    [
        # "This" equals exactly -> only span[0].
        pytest.param(StringOperator.EQUALS, "This", {"This"}, id="equals-this"),
        # "Thi" is a single-match substring ("is" would also match "This").
        pytest.param(StringOperator.CONTAINS, "Thi", {"This"}, id="contains-thi"),
        # STARTS_WITH "Th" -> only "This".
        pytest.param(StringOperator.STARTS_WITH, "Th", {"This"}, id="starts-with-th"),
        # ENDS_WITH "is" matches both "This" and "is".
        pytest.param(StringOperator.ENDS_WITH, "is", {"This", "is"}, id="ends-with-is"),
        # NOT_EQUALS "This" -> only "is".
        pytest.param(StringOperator.NOT_EQUALS, "This", {"is"}, id="not-equals-this"),
    ],
)
def test_span_rows_span_text_column_supports_string_operators(
    client: TestClient, search_project, operator, value, expected_texts
):
    """SPAN_TEXT supports all five string operators (span only).

    Span texts are "This" and "is" — "is" CONTAINS/ENDS_WITH matches both
    ("This" contains "is"), so "Thi" is used for a single-match substring.
    """
    page = _post_annotation_query(
        client,
        SPAN_URL,
        SpanAnnotationRow,
        search_project["project"].id,
        make_filter_tree(
            [make_filter_expr("e1", SpanColumns.SPAN_TEXT, operator, value)]
        ),
    )
    assert {row.span_text for row in page.items} == expected_texts


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
@pytest.mark.parametrize(
    "logic",
    [LogicalOperator.and_, LogicalOperator.or_],
    ids=["and", "or"],
)
def test_annotation_rows_filter_expressions_combine_with_and_or_logic(
    client: TestClient, search_project, entity, url, logic
):
    """Filter trees combine expressions with AND/OR logic."""
    row_model, columns_enum, key = ENTITY[entity]
    annotations = search_project[key]
    # code Alpha sits on sdoc_one; the other expression matches sdoc_two.
    code_alpha = {0}
    on_sdoc_two = {0, 1} - _on_sdoc_one_indices(entity)
    if logic == LogicalOperator.and_:
        # code Alpha AND on sdoc_two -> nothing (Alpha is on sdoc_one).
        expected_indices = code_alpha & on_sdoc_two
    else:
        # code Alpha OR on sdoc_two.
        expected_indices = code_alpha | on_sdoc_two
    expected_ids = {annotations[i].id for i in expected_indices}
    filter_tree = make_filter_tree(
        [
            make_filter_expr(
                "e1",
                columns_enum.CODE_ID_LIST_RECURSIVE,
                IDListRecursiveOperator.CONTAINS,
                search_project["code_alpha"].id,
            ),
            make_filter_expr(
                "e2",
                columns_enum.SOURCE_DOCUMENT_NAME,
                StringOperator.EQUALS,
                search_project["sdoc_two"].name,
            ),
        ],
        logic=logic,
    )
    assert (
        _annotation_ids(
            client, url, row_model, search_project["project"].id, filter_tree
        )
        == expected_ids
    )


# --- B. invalid filter input (HTTP 400 contracts) ----------------------------------
# Two kinds of malformed filter input, both surfaced as HTTP 400:
#   1. wrong-typed/malformed values: Pydantic only checks that `value` is a
#      bool/str/int/list, not that its type matches the operator, so the value
#      reaches `*Operator.apply()`, which raises InvalidFilterValueError -> 400.
#   2. operator/column family mismatch: the FilterExpression model_validator
#      rejects an operator whose family differs from the column's declared
#      family (OperatorNotCompatibleWithColumnError) -> 400.


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
@pytest.mark.parametrize(
    "column_name,operator,value,match",
    [
        # StringOperator rejects a non-str value.
        pytest.param(
            "SOURCE_DOCUMENT_NAME",
            StringOperator.EQUALS,
            123,
            r"Invalid value type for StringOperator \(requires str\)",
            id="sdoc-name-string-non-str",
        ),
        # StringOperator rejects a non-str value.
        pytest.param(
            "MEMO_CONTENT",
            StringOperator.CONTAINS,
            123,
            r"Invalid value type for StringOperator \(requires str\)",
            id="memo-content-string-non-str",
        ),
        # IDListRecursiveOperator rejects a nested-list value.
        pytest.param(
            "CODE_ID_LIST_RECURSIVE",
            IDListRecursiveOperator.CONTAINS,
            [["1"]],
            r"Invalid value type for IDListOperator \(requires list\[str\]\)",
            id="code-idlr-nested-list",
        ),
        # IDListRecursiveOperator rejects a nested-list value.
        pytest.param(
            "TAG_ID_LIST_RECURSIVE",
            IDListRecursiveOperator.CONTAINS,
            [["1"]],
            r"Invalid value type for IDListOperator \(requires list\[str\]\)",
            id="tag-idlr-nested-list",
        ),
        # IDListRecursiveOperator rejects a nested-list value.
        pytest.param(
            "FOLDER_ID_LIST_RECURSIVE",
            IDListRecursiveOperator.CONTAINS,
            [["1"]],
            r"Invalid value type for IDListOperator \(requires list\[str\]\)",
            id="folder-idlr-nested-list",
        ),
    ],
)
def test_annotation_search_rejects_wrong_typed_filter_values_with_400(
    client: TestClient,
    search_project,
    entity,
    url,
    column_name,
    operator,
    value,
    match,
):
    """Wrong-typed/malformed filter values are rejected with HTTP 400."""
    _, columns_enum, _ = ENTITY[entity]
    column = getattr(columns_enum, column_name)
    request = QueryRequest(
        project_id=search_project["project"].id,
        search_query="",
        filter=make_filter_tree([make_filter_expr("e1", column, operator, value)]),
        sorts=[],
        page_number=0,
        page_size=20,
    )
    response = client.post(url, json=request.model_dump(mode="json"))
    assert response.status_code == 400, response.text
    assert re.search(match, response.text), response.text


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
def test_annotation_search_rejects_wrong_typed_user_id_value_with_400(
    client: TestClient, search_project, entity, url
):
    """IDOperator rejects a list value with HTTP 400 (USER_ID column)."""
    _, columns_enum, _ = ENTITY[entity]
    request = QueryRequest(
        project_id=search_project["project"].id,
        search_query="",
        filter=make_filter_tree(
            [
                make_filter_expr(
                    "e1", columns_enum.USER_ID, IDOperator.EQUALS, ["invalid"]
                )
            ]
        ),
        sorts=[],
        page_number=0,
        page_size=20,
    )
    response = client.post(url, json=request.model_dump(mode="json"))
    assert response.status_code == 400, response.text
    assert re.search(
        r"Invalid value type for IDOperator \(requires int or str\)", response.text
    ), response.text


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
@pytest.mark.parametrize(
    "column_name,operator,value",
    [
        # SOURCE_DOCUMENT_NAME is a STRING column; an ID operator mismatches.
        pytest.param(
            "SOURCE_DOCUMENT_NAME",
            IDOperator.EQUALS,
            1,
            id="sdoc-name-string-with-id-op",
        ),
        # CODE_ID_LIST_RECURSIVE is an ID_LIST_RECURSIVE column; a STRING operator mismatches.
        pytest.param(
            "CODE_ID_LIST_RECURSIVE",
            StringOperator.CONTAINS,
            "1",
            id="code-idlr-with-string-op",
        ),
        # MEMO_CONTENT is a STRING column; an ID_LIST_RECURSIVE operator mismatches.
        pytest.param(
            "MEMO_CONTENT",
            IDListRecursiveOperator.CONTAINS,
            1,
            id="memo-content-string-with-idlr-op",
        ),
    ],
)
def test_annotation_search_rejects_operator_column_family_mismatch_with_400(
    client: TestClient, search_project, entity, url, column_name, operator, value
):
    """An operator whose family mismatches the column's family is rejected (400).

    The FilterExpression model_validator performs this check at request-validation
    time, so the raw payload must be sent as a dict (the DTO would raise locally).
    """
    _, columns_enum, _ = ENTITY[entity]
    column = getattr(columns_enum, column_name)
    payload = {
        "project_id": search_project["project"].id,
        "search_query": "",
        "filter": {
            "id": "root",
            "logic_operator": "and",
            "items": [
                {
                    "id": "e1",
                    "column": column.value,
                    "operator": operator.value,
                    "value": value,
                }
            ],
        },
        "sorts": [],
        "page_number": 0,
        "page_size": 20,
    }
    response = client.post(url, json=payload)
    assert response.status_code == 400, response.text
    assert "not compatible with column" in response.text


# --- C. full-text search, pagination & sorting --------------------------------------


@pytest.mark.parametrize(
    "search_query,expected_texts",
    [
        # "Thi" matches only span[0]'s text "This".
        pytest.param("Thi", {"This"}, id="query-thi"),
        # "is" matches both "This" and "is" (ilike %is%).
        pytest.param("is", {"This", "is"}, id="query-is"),
        # No match -> empty page.
        pytest.param("no-such-text", set(), id="query-no-match"),
    ],
)
def test_span_search_full_text_query_matches_span_text(
    client: TestClient, search_project, search_query, expected_texts
):
    """Span full-text search matches against the annotated span text (ilike)."""
    page = _post_annotation_query(
        client,
        SPAN_URL,
        SpanAnnotationRow,
        search_project["project"].id,
        empty_filter(),
        search_query=search_query,
    )
    assert {row.span_text for row in page.items} == expected_texts


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
def test_annotation_search_paginates_rows_without_overlap(
    client: TestClient, search_project, entity, url
):
    """Annotation row queries paginate deterministically without overlap."""
    row_model, _, _ = ENTITY[entity]

    def _page(page_number: int):
        return _post_annotation_query(
            client,
            url,
            row_model,
            search_project["project"].id,
            empty_filter(),
            page_number=page_number,
            page_size=1,
        )

    page0 = _page(0)
    page1 = _page(1)
    assert page0.total_results == 2
    assert len(page0.items) == 1
    assert len(page1.items) == 1
    # No overlap between pages; together they cover all annotations.
    ids0 = {row.id for row in page0.items}
    ids1 = {row.id for row in page1.items}
    assert ids0.isdisjoint(ids1)
    assert ids0 | ids1 == _entity_ids(search_project, entity)


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
@pytest.mark.parametrize(
    "direction,expected_name_order",
    [
        # Ascending by code name: Alpha (index 0) before Beta (index 1).
        pytest.param(SortDirection.ASC, ["Alpha", "Beta"], id="asc"),
        # Descending by code name: Beta before Alpha.
        pytest.param(SortDirection.DESC, ["Beta", "Alpha"], id="desc"),
    ],
)
def test_annotation_search_sorts_by_code_name(
    client: TestClient, search_project, entity, url, direction, expected_name_order
):
    """Sorting by CODE_ID_LIST_RECURSIVE orders rows by the code's name."""
    row_model, columns_enum, _ = ENTITY[entity]
    page = _post_annotation_query(
        client,
        url,
        row_model,
        search_project["project"].id,
        empty_filter(),
        sorts=[Sort(column=columns_enum.CODE_ID_LIST_RECURSIVE, direction=direction)],
    )
    assert [row.code.name for row in page.items] == expected_name_order


# --- D. drill-down (group_by + group_key on the row query) --------------------------
# A row query that sets BOTH group_by and group_key is restricted to the single
# group identified by group_key (exprs.key == group_key). Setting only one of
# group_by or group_key is rejected (422) by QueryRequest validation.


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
@pytest.mark.parametrize(
    "code_key,expected_index",
    [
        # Drill into the code Alpha group -> only the Alpha-coded annotation.
        pytest.param("code_alpha", 0, id="alpha"),
        # Drill into the code Beta group -> only the Beta-coded annotation.
        pytest.param("code_beta", 1, id="beta"),
    ],
)
def test_annotation_drill_down_into_code_group_returns_only_that_group(
    client: TestClient, search_project, entity, url, code_key, expected_index
):
    """Drilling into a code group returns only that code's annotation."""
    row_model, columns_enum, key = ENTITY[entity]
    code_id = search_project[code_key].id
    expected_id = search_project[key][expected_index].id
    page = _post_annotation_query(
        client,
        url,
        row_model,
        search_project["project"].id,
        empty_filter(),
        group_by=GroupConfig(field=columns_enum.CODE_ID_LIST_RECURSIVE),
        group_key=str(code_id),
    )
    assert page.total_results == 1
    assert page.items[0].id == expected_id
    assert page.items[0].code.id == code_id


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
def test_annotation_drill_down_into_user_group_returns_only_that_authors_rows(
    client: TestClient, search_project, entity, url
):
    """Drilling into an author group returns only that author's annotations."""
    row_model, columns_enum, key = ENTITY[entity]
    user_id = search_project["user"].id
    # test_user authored index 0 of span/sentence, but BOTH bbox annotations.
    expected_ids = {search_project[key][i].id for i in _USER_INDICES[entity]["user"]}
    page = _post_annotation_query(
        client,
        url,
        row_model,
        search_project["project"].id,
        empty_filter(),
        group_by=GroupConfig(field=columns_enum.USER_ID),
        group_key=str(user_id),
    )
    assert page.total_results == len(expected_ids)
    assert {item.id for item in page.items} == expected_ids
    assert all(item.user_id == user_id for item in page.items)


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
def test_annotation_drill_down_with_nonexistent_group_key_returns_empty_page(
    client: TestClient, search_project, entity, url
):
    """A group_key matching no group yields an empty page."""
    row_model, columns_enum, _ = ENTITY[entity]
    page = _post_annotation_query(
        client,
        url,
        row_model,
        search_project["project"].id,
        empty_filter(),
        group_by=GroupConfig(field=columns_enum.CODE_ID_LIST_RECURSIVE),
        group_key="no-such-group",
    )
    assert page.items == []
    assert page.total_results == 0


@pytest.mark.parametrize(
    "entity,url",
    [
        pytest.param("span", SPAN_URL, id="span"),
        pytest.param("sentence", SENT_URL, id="sentence"),
        pytest.param("bbox", BBOX_URL, id="bbox"),
    ],
)
@pytest.mark.parametrize(
    "group_by_field,group_key",
    [
        # group_by alone (no group_key) is rejected.
        pytest.param("CODE_ID_LIST_RECURSIVE", None, id="group-by-without-key"),
        # group_key alone (no group_by) is rejected.
        pytest.param(None, "1", id="key-without-group-by"),
    ],
)
def test_annotation_drill_down_requires_group_by_and_group_key_together(
    client: TestClient, search_project, entity, url, group_by_field, group_key
):
    """Setting only one of group_by/group_key is rejected with HTTP 422."""
    _, columns_enum, _ = ENTITY[entity]
    payload = {
        "project_id": search_project["project"].id,
        "search_query": "",
        "filter": empty_filter().model_dump(mode="json"),
        "sorts": [],
        "group_by": (
            {"field": getattr(columns_enum, group_by_field).value}
            if group_by_field
            else None
        ),
        "group_key": group_key,
        "page_number": 0,
        "page_size": 20,
    }
    response = client.post(url, json=payload)
    assert response.status_code == 422, response.text
    assert "Both 'group_by' and 'group_key' must be provided together" in response.text


@pytest.mark.parametrize(
    "entity,url,non_groupable_column",
    [
        # SPAN_TEXT is not groupable.
        pytest.param("span", SPAN_URL, "SPAN_TEXT", id="span-text"),
        # MEMO_CONTENT is not groupable (sentence).
        pytest.param("sentence", SENT_URL, "MEMO_CONTENT", id="sentence-memo-content"),
        # MEMO_CONTENT is not groupable (bbox).
        pytest.param("bbox", BBOX_URL, "MEMO_CONTENT", id="bbox-memo-content"),
    ],
)
def test_annotation_drill_down_into_non_groupable_column_rejected_with_400(
    client: TestClient, search_project, entity, url, non_groupable_column
):
    """Drilling into a non-groupable column is rejected with HTTP 400."""
    _, columns_enum, _ = ENTITY[entity]
    column = getattr(columns_enum, non_groupable_column)
    request = QueryRequest(
        project_id=search_project["project"].id,
        search_query="",
        filter=empty_filter(),
        sorts=[],
        group_by=GroupConfig(field=column),
        group_key="x",
        page_number=0,
        page_size=20,
    )
    response = client.post(url, json=request.model_dump(mode="json"))
    assert response.status_code == 400, response.text
    assert "does not support grouping" in response.text


# ===========================================================================
# GROUP QUERIES (/search/*_annotation/groups)
# ===========================================================================
# Grouping partitions by KEY (never label); each column defines its own key/label
# and optionally a drill-down target (see get_group_expressions).
#
# Deterministic fixture facts used below:
#   - 2 annotations per entity, one coded Alpha (index 0), one coded Beta (index 1).
#   - Authors: span/sentence index 0 by test_user, index 1 by other_user; both
#     bbox annotations by test_user.
#   - Documents: both spans on sdoc_one; sentence/bbox split one-per-sdoc.


def _post_annotation_group_query(
    client: TestClient,
    url: str,
    columns_enum,
    project_id: int,
    group_by: GroupConfig,
    filter_tree: Filter | None = None,
    page_number: int = 0,
    page_size: int = 20,
) -> GroupPage:
    """POST an annotation group query and return the validated GroupPage."""
    request = GroupQueryRequest[columns_enum](
        project_id=project_id,
        search_query="",
        filter=filter_tree if filter_tree is not None else empty_filter(),
        group_by=group_by,
        page_number=page_number,
        page_size=page_size,
    )
    response = client.post(url, json=request.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    return GroupPage.model_validate(response.json())


# --- A. one bucket per column value ----------------------------------------------


@pytest.mark.parametrize(
    "entity,groups_url",
    [
        pytest.param("span", SPAN_GROUPS_URL, id="span"),
        pytest.param("sentence", SENT_GROUPS_URL, id="sentence"),
        pytest.param("bbox", BBOX_GROUPS_URL, id="bbox"),
    ],
)
def test_annotation_group_by_code_yields_one_bucket_per_code(
    client: TestClient, search_project, entity, groups_url
):
    """Grouping by code yields one bucket per code, each with count 1 and a target."""
    _, columns_enum, _ = ENTITY[entity]
    page = _post_annotation_group_query(
        client,
        groups_url,
        columns_enum,
        search_project["project"].id,
        GroupConfig(field=columns_enum.CODE_ID_LIST_RECURSIVE),
    )
    # One annotation per code -> two buckets of 1, keyed by code id, labelled by name.
    counts = {g.label: g.total_results for g in page.items}
    assert counts == {"Alpha": 1, "Beta": 1}
    assert page.total_results == 2
    # Code groups carry a drill-down target pointing at the code.
    for g in page.items:
        assert g.target_id is not None
        assert g.target_type == "code"


@pytest.mark.parametrize(
    "entity,groups_url",
    [
        pytest.param("span", SPAN_GROUPS_URL, id="span"),
        pytest.param("sentence", SENT_GROUPS_URL, id="sentence"),
        pytest.param("bbox", BBOX_GROUPS_URL, id="bbox"),
    ],
)
def test_annotation_group_by_user_id_yields_one_bucket_per_author(
    client: TestClient, search_project, entity, groups_url
):
    """Grouping by author yields one bucket per authoring user.

    span/sentence are authored one-per-user (two buckets of 1); both bbox
    annotations are by test_user (one bucket of 2).
    """
    _, columns_enum, _ = ENTITY[entity]
    page = _post_annotation_group_query(
        client,
        groups_url,
        columns_enum,
        search_project["project"].id,
        GroupConfig(field=columns_enum.USER_ID),
    )
    counts = {g.label: g.total_results for g in page.items}
    if entity == "bbox":
        # Both bbox annotations by test_user -> a single bucket of 2.
        assert counts == {search_project["user"].email: 2}
        assert page.total_results == 1
    else:
        # One annotation per user -> two buckets of 1, labelled by email.
        assert counts == {
            search_project["user"].email: 1,
            search_project["other_user"].email: 1,
        }
        assert page.total_results == 2


@pytest.mark.parametrize(
    "entity,groups_url,expected_counts",
    [
        # Both spans on sdoc_one -> a single "Test Document" bucket of 2.
        pytest.param("span", SPAN_GROUPS_URL, {"Test Document": 2}, id="span"),
        # One sentence anno per sdoc -> two buckets of 1.
        pytest.param(
            "sentence",
            SENT_GROUPS_URL,
            {"Test Document": 1, "Second Document": 1},
            id="sentence",
        ),
        # One bbox per sdoc -> two buckets of 1.
        pytest.param(
            "bbox",
            BBOX_GROUPS_URL,
            {"Test Document": 1, "Second Document": 1},
            id="bbox",
        ),
    ],
)
def test_annotation_group_by_source_document_name_buckets_by_document(
    client: TestClient, search_project, entity, groups_url, expected_counts
):
    """Grouping by document name buckets annotations by their sdoc."""
    _, columns_enum, _ = ENTITY[entity]
    page = _post_annotation_group_query(
        client,
        groups_url,
        columns_enum,
        search_project["project"].id,
        GroupConfig(field=columns_enum.SOURCE_DOCUMENT_NAME),
    )
    counts = {g.label: g.total_results for g in page.items}
    assert counts == expected_counts
    assert page.total_results == len(expected_counts)
    # Document groups carry a drill-down target pointing at the sdoc.
    for g in page.items:
        assert g.target_id is not None
        assert g.target_type == "source_document"


# --- B. filter is applied before grouping ------------------------------------------


@pytest.mark.parametrize(
    "entity,groups_url",
    [
        pytest.param("span", SPAN_GROUPS_URL, id="span"),
        pytest.param("sentence", SENT_GROUPS_URL, id="sentence"),
        pytest.param("bbox", BBOX_GROUPS_URL, id="bbox"),
    ],
)
def test_annotation_group_query_applies_filter_before_grouping(
    client: TestClient, search_project, entity, groups_url
):
    """A filter is applied before grouping: only matching rows are bucketed."""
    _, columns_enum, _ = ENTITY[entity]
    page = _post_annotation_group_query(
        client,
        groups_url,
        columns_enum,
        search_project["project"].id,
        GroupConfig(field=columns_enum.CODE_ID_LIST_RECURSIVE),
        filter_tree=make_filter_tree(
            [
                make_filter_expr(
                    "e1",
                    columns_enum.CODE_ID_LIST_RECURSIVE,
                    IDListRecursiveOperator.CONTAINS,
                    search_project["code_alpha"].id,
                )
            ]
        ),
    )
    # Only the Alpha-coded annotation is grouped -> a single "Alpha" bucket.
    assert page.total_results == 1
    assert page.items[0].label == "Alpha"
    assert page.items[0].total_results == 1


# --- C. errors & edge cases ---------------------------------------------------------


@pytest.mark.parametrize(
    "entity,groups_url,non_groupable_column",
    [
        # SPAN_TEXT is not groupable.
        pytest.param("span", SPAN_GROUPS_URL, "SPAN_TEXT", id="span-text"),
        # MEMO_CONTENT is not groupable (sentence).
        pytest.param(
            "sentence", SENT_GROUPS_URL, "MEMO_CONTENT", id="sentence-memo-content"
        ),
        # MEMO_CONTENT is not groupable (bbox).
        pytest.param("bbox", BBOX_GROUPS_URL, "MEMO_CONTENT", id="bbox-memo-content"),
    ],
)
def test_annotation_group_by_non_groupable_column_rejected_with_400(
    client: TestClient, search_project, entity, groups_url, non_groupable_column
):
    """Grouping by a non-groupable column is rejected with HTTP 400."""
    _, columns_enum, _ = ENTITY[entity]
    column = getattr(columns_enum, non_groupable_column)
    request = GroupQueryRequest(
        project_id=search_project["project"].id,
        search_query="",
        filter=empty_filter(),
        group_by=GroupConfig(field=column),
        page_number=0,
        page_size=20,
    )
    response = client.post(groups_url, json=request.model_dump(mode="json"))
    assert response.status_code == 400, response.text
    assert "does not support grouping" in response.text


@pytest.mark.parametrize(
    "entity,groups_url",
    [
        pytest.param("span", SPAN_GROUPS_URL, id="span"),
        pytest.param("sentence", SENT_GROUPS_URL, id="sentence"),
        pytest.param("bbox", BBOX_GROUPS_URL, id="bbox"),
    ],
)
def test_annotation_group_query_with_filter_matching_nothing_returns_no_groups(
    client: TestClient, search_project, entity, groups_url
):
    """A filter matching nothing yields zero groups."""
    _, columns_enum, _ = ENTITY[entity]
    page = _post_annotation_group_query(
        client,
        groups_url,
        columns_enum,
        search_project["project"].id,
        GroupConfig(field=columns_enum.CODE_ID_LIST_RECURSIVE),
        filter_tree=make_filter_tree(
            [
                make_filter_expr(
                    "e1",
                    columns_enum.SOURCE_DOCUMENT_NAME,
                    StringOperator.EQUALS,
                    "No such document",
                )
            ]
        ),
    )
    assert page.items == []
    assert page.total_results == 0
