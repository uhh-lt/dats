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
from systems.search_system.filtering_operators import IDOperator
from systems.search_system.grouping import GroupConfig, GroupPage, GroupQueryRequest

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
def test_search_source_user_not_equals_skips_annotations_without_provenance(
    client: TestClient, provenance_project_with_copies, kind: AnnotationKind
) -> None:
    """NOT_EQUALS compares with SQL `!=`, so annotations without a source user
    (NULL) match neither EQUALS nor NOT_EQUALS: only copies are returned."""
    project = provenance_project_with_copies

    page = _search(
        client, kind, project["project"].id, IDOperator.NOT_EQUALS, project["user"].id
    )

    assert [row.id for row in page.items] == [project[f"{kind}_copies"]["copy_id"]]


# --- B. group by source user -------------------------------------------------------


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
