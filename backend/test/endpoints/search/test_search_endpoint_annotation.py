"""Endpoint tests for the annotation search endpoints (/search/*_annotation*).

Covers span, sentence, and bbox annotations, parametrized across the three
entities. All tests run against the deterministic `search_project` fixture (see
conftest.py), which builds 2 annotations of each type split across
codes/users/sdocs/tags/folders/memos.

Because the data is fixed, every filter/group combination below has a known,
deterministic expected result. The fixture docstring documents the exact
contents and the non-obvious derived behavior (NULL memo columns, the TAG/FOLDER
aggregates, the "This"/"is" span-text trap).
"""

import re

import pytest
from fastapi.testclient import TestClient

from modules.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
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
from systems.search_system.filtering import Filter, LogicalOperator
from systems.search_system.filtering_operators import (
    IDListRecursiveOperator,
    IDOperator,
    StringOperator,
)
from systems.search_system.grouping import GroupConfig, GroupPage, GroupQueryRequest
from systems.search_system.sorting import Sort, SortDirection

from .filter_utils import empty_filter, make_filter_expr, make_filter_tree

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
        SpanColumns.SOURCE_DOCUMENT_NAME,
    },
    "sentence": {
        SentAnnoColumns.CODE_ID_LIST_RECURSIVE,
        SentAnnoColumns.USER_ID,
        SentAnnoColumns.SOURCE_DOCUMENT_NAME,
    },
    "bbox": {
        BBoxColumns.CODE_ID_LIST_RECURSIVE,
        BBoxColumns.USER_ID,
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
        # NULL memo rows match NO string operator, not even NOT_EQUALS -> only index 0.
        pytest.param(
            StringOperator.NOT_EQUALS,
            "memo_content",
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
    "logic,expected_indices",
    [
        # AND: code Alpha AND on sdoc_two -> nothing (Alpha is on sdoc_one).
        pytest.param(LogicalOperator.and_, set(), id="and"),
        # OR: code Alpha OR on sdoc_two -> both annotations.
        pytest.param(LogicalOperator.or_, {0, 1}, id="or"),
    ],
)
def test_annotation_rows_filter_expressions_combine_with_and_or_logic(
    client: TestClient, search_project, entity, url, logic, expected_indices
):
    """Filter trees combine expressions with AND/OR logic."""
    row_model, columns_enum, key = ENTITY[entity]
    annotations = search_project[key]
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
