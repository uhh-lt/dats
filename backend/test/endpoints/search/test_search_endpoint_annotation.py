"""Endpoint tests for the annotation search endpoints (/search/*_annotation*).

Covers span, sentence, and bbox annotations, parametrized across the three
entities. All tests run against the deterministic `search_project` fixture (see
conftest.py), which builds 2 annotations of each type split across codes/users/sdocs.

Because the data is fixed, every filter/group combination below has a known,
deterministic expected result.
"""

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
from systems.search_system.filtering import Filter
from systems.search_system.filtering_operators import IDOperator, StringOperator
from systems.search_system.grouping import GroupConfig, GroupPage, GroupQueryRequest

from .filter_utils import empty_filter, make_filter_expr, make_filter_tree

# ===========================================================================
# INFO ENDPOINTS
# ===========================================================================


@pytest.mark.parametrize(
    "url,expected_groupable",
    [
        pytest.param(
            "/search/span_annotation_info",
            {
                SpanColumns.CODE_ID,
                SpanColumns.USER_ID,
                SpanColumns.SOURCE_DOCUMENT_NAME,
            },
            id="span",
        ),
        pytest.param(
            "/search/sentence_annotation_info",
            {
                SentAnnoColumns.CODE_ID,
                SentAnnoColumns.USER_ID,
                SentAnnoColumns.SOURCE_DOCUMENT_NAME,
            },
            id="sentence",
        ),
        pytest.param(
            "/search/bbox_annotation_info",
            {BBoxColumns.CODE_ID, BBoxColumns.SOURCE_DOCUMENT_NAME},
            id="bbox",
        ),
    ],
)
def test_annotation_info_groupable_flags(
    client: TestClient, search_project, url, expected_groupable
):
    """Annotation info marks exactly the documented columns as groupable."""
    response = client.post(url, params={"project_id": search_project["project"].id})
    assert response.status_code == 200, response.text
    infos = [ColumnInfo.model_validate(x) for x in response.json()]
    groupable = {info.column for info in infos if info.groupable}
    assert groupable == expected_groupable


# ===========================================================================
# ROW QUERIES — FILTERS
# ===========================================================================


def _annotation_count(
    client: TestClient, url: str, project_id: int, filter_tree: Filter, row_model
) -> int:
    """Run an annotation row query and return the number of matching rows."""
    request = QueryRequest(
        project_id=project_id,
        search_query="",
        filter=filter_tree,
        sorts=[],
        page_number=0,
        page_size=20,
    )
    response = client.post(url, json=request.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    return Page[row_model].model_validate(response.json()).total_results


@pytest.mark.parametrize(
    "url,row_model,expected_total",
    [
        pytest.param("/search/span_annotation", SpanAnnotationRow, 2, id="span"),
        pytest.param(
            "/search/sentence_annotation", SentenceAnnotationRow, 2, id="sentence"
        ),
        pytest.param("/search/bbox_annotation", BBoxAnnotationRow, 2, id="bbox"),
    ],
)
def test_annotation_rows_no_filter(
    client: TestClient, search_project, url, row_model, expected_total
):
    """With no filter, each annotation row query returns all annotations of that type."""
    request = QueryRequest(
        project_id=search_project["project"].id,
        search_query="",
        filter=empty_filter(),
        sorts=[],
        page_number=0,
        page_size=20,
    )
    response = client.post(url, json=request.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    page = Page[row_model].model_validate(response.json())
    assert page.total_results == expected_total
    assert len(page.items) == expected_total


@pytest.mark.parametrize(
    "url,row_model,code_column,expected_count",
    [
        pytest.param(
            "/search/span_annotation",
            SpanAnnotationRow,
            SpanColumns.CODE_ID,
            1,
            id="span-by-code",
        ),
        pytest.param(
            "/search/sentence_annotation",
            SentenceAnnotationRow,
            SentAnnoColumns.CODE_ID,
            1,
            id="sentence-by-code",
        ),
        pytest.param(
            "/search/bbox_annotation",
            BBoxAnnotationRow,
            BBoxColumns.CODE_ID,
            1,
            id="bbox-by-code",
        ),
    ],
)
def test_annotation_rows_filter_by_code(
    client: TestClient, search_project, url, row_model, code_column, expected_count
):
    """Filtering annotations by code Alpha returns exactly the Alpha-coded annotation."""
    code_id = search_project["code_alpha"].id
    request = QueryRequest(
        project_id=search_project["project"].id,
        search_query="",
        filter=make_filter_tree(
            [make_filter_expr("e1", code_column, IDOperator.EQUALS, code_id)]
        ),
        sorts=[],
        page_number=0,
        page_size=20,
    )
    response = client.post(url, json=request.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    page = Page[row_model].model_validate(response.json())
    assert page.total_results == expected_count
    assert all(row.code.id == code_id for row in page.items)


# Each annotation entity exposes a SOURCE_DOCUMENT_NAME string column. sdoc_one is
# "Test Document", sdoc_two is "Second Document". Span annotations are both on
# sdoc_one; sentence/bbox are split one-per-sdoc.
@pytest.mark.parametrize(
    "url,row_model,name_column,equals_count,not_equals_count",
    [
        pytest.param(
            "/search/span_annotation",
            SpanAnnotationRow,
            SpanColumns.SOURCE_DOCUMENT_NAME,
            2,  # both spans on sdoc_one
            0,
            id="span",
        ),
        pytest.param(
            "/search/sentence_annotation",
            SentenceAnnotationRow,
            SentAnnoColumns.SOURCE_DOCUMENT_NAME,
            1,  # one sentence anno per sdoc
            1,
            id="sentence",
        ),
        pytest.param(
            "/search/bbox_annotation",
            BBoxAnnotationRow,
            BBoxColumns.SOURCE_DOCUMENT_NAME,
            1,  # one bbox per sdoc
            1,
            id="bbox",
        ),
    ],
)
def test_annotation_rows_string_filters(
    client: TestClient,
    search_project,
    url,
    row_model,
    name_column,
    equals_count,
    not_equals_count,
):
    """Annotation SOURCE_DOCUMENT_NAME string filters (EQUALS / NOT_EQUALS / CONTAINS)."""
    project_id = search_project["project"].id
    sdoc_one_name = search_project["sdoc_one"].name  # "Test Document"

    assert (
        _annotation_count(
            client,
            url,
            project_id,
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1", name_column, StringOperator.EQUALS, sdoc_one_name
                    )
                ]
            ),
            row_model,
        )
        == equals_count
    )
    assert (
        _annotation_count(
            client,
            url,
            project_id,
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1", name_column, StringOperator.NOT_EQUALS, sdoc_one_name
                    )
                ]
            ),
            row_model,
        )
        == not_equals_count
    )
    # CONTAINS "Document" matches both sdoc names -> all annotations of that type.
    assert (
        _annotation_count(
            client,
            url,
            project_id,
            make_filter_tree(
                [
                    make_filter_expr(
                        "e1", name_column, StringOperator.CONTAINS, "Document"
                    )
                ]
            ),
            row_model,
        )
        == 2
    )


@pytest.mark.parametrize(
    "url,row_model,user_column,author,expected_count",
    [
        # span: one by test_user, one by other_user
        pytest.param(
            "/search/span_annotation",
            SpanAnnotationRow,
            SpanColumns.USER_ID,
            "user",
            1,
            id="span-by-user",
        ),
        pytest.param(
            "/search/span_annotation",
            SpanAnnotationRow,
            SpanColumns.USER_ID,
            "other_user",
            1,
            id="span-by-other-user",
        ),
        # sentence: one per user
        pytest.param(
            "/search/sentence_annotation",
            SentenceAnnotationRow,
            SentAnnoColumns.USER_ID,
            "user",
            1,
            id="sentence-by-user",
        ),
        # (bbox has no USER_ID column, so it is not parametrized here)
    ],
)
def test_annotation_rows_user_filters(
    client: TestClient,
    search_project,
    url,
    row_model,
    user_column,
    author,
    expected_count,
):
    """Annotation USER_ID ID filters match by authoring user."""
    project_id = search_project["project"].id
    author_id = search_project[author].id
    assert (
        _annotation_count(
            client,
            url,
            project_id,
            make_filter_tree(
                [make_filter_expr("e1", user_column, IDOperator.EQUALS, author_id)]
            ),
            row_model,
        )
        == expected_count
    )


# ===========================================================================
# GROUP QUERIES
# ===========================================================================


@pytest.mark.parametrize(
    "url,group_field,expected_counts",
    [
        pytest.param(
            "/search/span_annotation/groups",
            SpanColumns.CODE_ID,
            [1, 1],
            id="span-by-code",
        ),
        pytest.param(
            "/search/sentence_annotation/groups",
            SentAnnoColumns.CODE_ID,
            [1, 1],
            id="sentence-by-code",
        ),
        pytest.param(
            "/search/bbox_annotation/groups",
            BBoxColumns.CODE_ID,
            [1, 1],
            id="bbox-by-code",
        ),
    ],
)
def test_annotation_groups_by_code(
    client: TestClient, search_project, url, group_field, expected_counts
):
    """Grouping annotations by code yields one bucket per code, each with count 1."""
    request = GroupQueryRequest(
        project_id=search_project["project"].id,
        search_query="",
        filter=empty_filter(),
        group_by=GroupConfig(field=group_field),
        page_number=0,
        page_size=20,
    )
    response = client.post(url, json=request.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    page = GroupPage.model_validate(response.json())
    assert sorted(g.total_results for g in page.items) == expected_counts
    assert page.total_results == len(expected_counts)
    # Code groups carry a drill-down target pointing at the code.
    for g in page.items:
        assert g.target_id is not None
        assert g.target_type == "code"


# ===========================================================================
# DRILL-DOWN (group_by + group_key on the row query)
# ===========================================================================


def test_span_drill_down_by_code(client: TestClient, search_project):
    """Span drill-down by code returns only the span annotated with that code."""
    code_id = search_project["code_beta"].id
    request = QueryRequest[SpanColumns](
        project_id=search_project["project"].id,
        search_query="",
        filter=empty_filter(),
        sorts=[],
        group_by=GroupConfig(field=SpanColumns.CODE_ID),
        group_key=str(code_id),
        page_number=0,
        page_size=20,
    )
    response = client.post(
        "/search/span_annotation", json=request.model_dump(mode="json")
    )
    assert response.status_code == 200, response.text
    page = Page[SpanAnnotationRow].model_validate(response.json())
    assert page.total_results == 1
    assert page.items[0].code.id == code_id
