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
from systems.search_system.filtering import Filter, FilterExpression, LogicalOperator
from systems.search_system.filtering_operators import NONE_FILTER_ID, IDOperator
from systems.search_system.grouping import GroupConfig, GroupPage, GroupQueryRequest
from systems.search_system.sorting import Sort, SortDirection

from .provenance_utils import ANNOTATION_KINDS, AnnotationKind

COLUMNS = {
    "span": SpanColumns,
    "sentence": SentAnnoColumns,
    "bbox": BBoxColumns,
}
ROW_DTO = {
    "span": SpanAnnotationRow,
    "sentence": SentenceAnnotationRow,
    "bbox": BBoxAnnotationRow,
}

# ===========================================================================
# SEARCH ANNOTATIONS (/search/*_annotation) TESTS
# ===========================================================================


def _search(
    client: TestClient,
    kind: AnnotationKind,
    project_id: int,
    operator: IDOperator,
    value: int,
):
    """Search the annotations of a kind filtered by SOURCE_USER_ID."""
    columns = COLUMNS[kind]
    request = QueryRequest[columns](
        project_id=project_id,
        filter=Filter[columns](
            id="root",
            logic_operator=LogicalOperator.and_,
            items=[
                FilterExpression[columns](
                    id="source-user",
                    column=columns.SOURCE_USER_ID,
                    operator=operator,
                    value=value,
                )
            ],
        ),
        sorts=[],
        page_number=0,
        page_size=50,
    )
    response = client.post(
        f"/search/{kind}_annotation", json=request.model_dump(mode="json")
    )
    assert response.status_code == 200, response.text
    return Page[ROW_DTO[kind]].model_validate(response.json())


def _all_annotation_ids(project, kind: AnnotationKind) -> set[int]:
    """The ids of the five annotations of a kind in the project: the assistant's
    three, the copy and the test user's own one."""
    return {
        project[kind]["source_id"],
        project[kind]["source_plain_id"],
        project[kind]["other_sdoc_source_id"],
        project[f"{kind}_copies"]["copy_id"],
        project[f"{kind}_copies"]["own_id"],
    }


# --- A. filter by source user ("Accepted from") ------------------------------------


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_search_source_user_equals_returns_copies_of_that_user(
    client: TestClient, provenance_project_with_copies, kind: AnnotationKind
) -> None:
    """Filtering by the assistant as source user returns only the copy accepted from
    the assistant, with its provenance in the row."""
    project = provenance_project_with_copies

    page = _search(
        client,
        kind,
        project["project"].id,
        IDOperator.EQUALS,
        project["assistant"].id,
    )

    assert [row.id for row in page.items] == [project[f"{kind}_copies"]["copy_id"]]
    row = page.items[0]
    assert row.user_id == project["user"].id
    assert row.source_user_id == project["assistant"].id
    assert row.source_code_id == project["code_a"].id


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_search_source_user_equals_other_user_returns_nothing(
    client: TestClient, provenance_project_with_copies, kind: AnnotationKind
) -> None:
    """Nothing was accepted from the test user."""
    project = provenance_project_with_copies

    page = _search(
        client, kind, project["project"].id, IDOperator.EQUALS, project["user"].id
    )

    assert page.items == []


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_search_source_user_not_equals_includes_annotations_without_provenance(
    client: TestClient, provenance_project_with_copies, kind: AnnotationKind
) -> None:
    """Annotations without a source user are not accepted from the assistant, so
    NOT_EQUALS returns all annotations but the copy."""
    project = provenance_project_with_copies

    page = _search(
        client,
        kind,
        project["project"].id,
        IDOperator.NOT_EQUALS,
        project["assistant"].id,
    )

    assert {row.id for row in page.items} == _all_annotation_ids(project, kind) - {
        project[f"{kind}_copies"]["copy_id"]
    }


@pytest.mark.parametrize(
    "operator,expects_copies",
    [
        # "= None" selects the "Not accepted" annotations ...
        pytest.param(IDOperator.EQUALS, False, id="equals-none"),
        # ... and "≠ None" all copies.
        pytest.param(IDOperator.NOT_EQUALS, True, id="not-equals-none"),
    ],
)
@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_search_source_user_none_selects_annotations_without_provenance(
    client: TestClient,
    provenance_project_with_copies,
    kind: AnnotationKind,
    operator: IDOperator,
    expects_copies: bool,
) -> None:
    """The value NONE_FILTER_ID (the frontend's "None") matches annotations without
    a source user: the assistant's three and the test user's own one."""
    project = provenance_project_with_copies
    copy_ids = {project[f"{kind}_copies"]["copy_id"]}

    page = _search(client, kind, project["project"].id, operator, NONE_FILTER_ID)

    expected = (
        copy_ids if expects_copies else _all_annotation_ids(project, kind) - copy_ids
    )
    assert {row.id for row in page.items} == expected


# --- B. sort by source user --------------------------------------------------------


@pytest.mark.parametrize("direction", [SortDirection.ASC, SortDirection.DESC])
@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_search_sort_by_source_user_puts_annotations_without_provenance_last(
    client: TestClient,
    provenance_project_with_copies,
    kind: AnnotationKind,
    direction: SortDirection,
) -> None:
    """SOURCE_USER_ID sorts by the source user's last name; annotations without a
    source user come last in both directions, so the copy is always first."""
    project = provenance_project_with_copies
    columns = COLUMNS[kind]
    request = QueryRequest[columns](
        project_id=project["project"].id,
        filter=Filter[columns](
            id="root", logic_operator=LogicalOperator.and_, items=[]
        ),
        sorts=[Sort[columns](column=columns.SOURCE_USER_ID, direction=direction)],
        page_number=0,
        page_size=50,
    )

    response = client.post(
        f"/search/{kind}_annotation", json=request.model_dump(mode="json")
    )

    assert response.status_code == 200, response.text
    page = Page[ROW_DTO[kind]].model_validate(response.json())
    assert [row.source_user_id for row in page.items] == [
        project["assistant"].id,
        None,
        None,
        None,
        None,
    ]


# --- C. group by source user -------------------------------------------------------


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_search_group_by_source_user_counts_copies_per_source_user(
    client: TestClient, provenance_project_with_copies, kind: AnnotationKind
) -> None:
    """Grouping by SOURCE_USER_ID gives one group per source user (labeled by email)
    and one "Not accepted" group for the four annotations without provenance (the
    assistant's three and the test user's own one), sorted last."""
    project = provenance_project_with_copies
    columns = COLUMNS[kind]
    request = GroupQueryRequest[columns](
        project_id=project["project"].id,
        filter=Filter[columns](
            id="root", logic_operator=LogicalOperator.and_, items=[]
        ),
        group_by=GroupConfig[columns](field=columns.SOURCE_USER_ID),
        page_number=0,
        page_size=20,
    )

    response = client.post(
        f"/search/{kind}_annotation/groups", json=request.model_dump(mode="json")
    )

    assert response.status_code == 200, response.text
    page = GroupPage.model_validate(response.json())
    assert [(group.key, group.label, group.total_results) for group in page.items] == [
        (str(project["assistant"].id), project["assistant"].email, 1),
        ("__none__", "Not accepted", 4),
    ]
