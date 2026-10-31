import pytest
from fastapi.testclient import TestClient

from dats_test_utils import create_user_client
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

from .provenance_utils import (
    ANNOTATION_KINDS,
    READ_DTO,
    AnnotationKind,
    create_payload,
    get_annotation,
    get_memos,
    get_user_annotation_ids,
)

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
# CREATE ANNOTATION (/span, /sentence, /bbox) TESTS
# ===========================================================================

# --- A. single copies record their provenance --------------------------------------


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_create_copy_records_source_annotation_user_and_code(
    client: TestClient, provenance_project, kind: AnnotationKind
) -> None:
    """A copy stores its source annotation and the source's user and code; it
    belongs to the copying user, with the code the client sent."""
    annotations = provenance_project[kind]
    payload = create_payload(
        kind,
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_b"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )

    response = client.put(f"/{kind}", json=payload)

    assert response.status_code == 200, response.text
    copy = READ_DTO[kind].model_validate(response.json())
    assert copy.user_id == provenance_project["user"].id
    assert copy.code_id == provenance_project["code_b"].id
    assert copy.source_annotation_id == annotations["source_id"]
    assert copy.source_user_id == provenance_project["assistant"].id
    assert copy.source_code_id == provenance_project["code_a"].id


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_create_copy_is_created_after_its_source(
    client: TestClient, provenance_project, kind: AnnotationKind
) -> None:
    """The copy time is the copy's own `created`, not the source's."""
    annotations = provenance_project[kind]
    source = get_annotation(client, kind, annotations["source_id"])
    payload = create_payload(
        kind,
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )

    response = client.put(f"/{kind}", json=payload)

    assert response.status_code == 200, response.text
    copy = READ_DTO[kind].model_validate(response.json())
    assert copy.created > source.created


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_create_copy_copies_memos_of_source_with_their_authors(
    client: TestClient, provenance_project, kind: AnnotationKind
) -> None:
    """The source's memos are copied onto the copy: new memos with the same title,
    icon and content, still authored by their original authors. The source keeps
    its own memos."""
    annotations = provenance_project[kind]
    source_memos = annotations["source_memos"]
    payload = create_payload(
        kind,
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )

    response = client.put(f"/{kind}", json=payload)

    assert response.status_code == 200, response.text
    copy = READ_DTO[kind].model_validate(response.json())
    copied_memos = get_memos(client, kind, copy.id)
    assert sorted(copy.memo_ids) == sorted(memo.id for memo in copied_memos)
    assert {
        (memo.title, memo.icon, memo.content, memo.content_json, memo.user_id)
        for memo in copied_memos
    } == {
        (memo.title, memo.icon, memo.content, memo.content_json, memo.user_id)
        for memo in source_memos
    }
    assert not {memo.id for memo in copied_memos} & {memo.id for memo in source_memos}
    assert all(memo.attached_object_id == copy.id for memo in copied_memos)
    assert {memo.id for memo in get_memos(client, kind, annotations["source_id"])} == {
        memo.id for memo in source_memos
    }


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_create_copy_of_source_without_memos_has_no_memos(
    client: TestClient, provenance_project, kind: AnnotationKind
) -> None:
    """Copying a source without memos records the provenance and creates no memo."""
    annotations = provenance_project[kind]
    payload = create_payload(
        kind,
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=1,
        source_annotation_id=annotations["source_plain_id"],
    )

    response = client.put(f"/{kind}", json=payload)

    assert response.status_code == 200, response.text
    copy = READ_DTO[kind].model_validate(response.json())
    assert copy.source_annotation_id == annotations["source_plain_id"]
    assert copy.memo_ids == []


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_create_own_annotation_has_no_provenance(
    client: TestClient, provenance_project, kind: AnnotationKind
) -> None:
    """An annotation created without a source has no provenance."""
    annotations = provenance_project[kind]
    payload = create_payload(
        kind,
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=2,
    )

    response = client.put(f"/{kind}", json=payload)

    assert response.status_code == 200, response.text
    annotation = READ_DTO[kind].model_validate(response.json())
    assert annotation.source_annotation_id is None
    assert annotation.source_user_id is None
    assert annotation.source_code_id is None
    assert annotation.memo_ids == []


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_create_copy_of_own_annotation_is_recorded(
    client: TestClient, provenance_project_with_copies, kind: AnnotationKind
) -> None:
    """Copying one's own annotation (e.g. of an earlier run) records the provenance
    like any other source."""
    project = provenance_project_with_copies
    own_id = project[f"{kind}_copies"]["own_id"]
    payload = create_payload(
        kind,
        sdoc_id=project[kind]["sdoc_id"],
        code_id=project["code_a"].id,
        position=1,
        source_annotation_id=own_id,
    )

    response = client.put(f"/{kind}", json=payload)

    assert response.status_code == 200, response.text
    copy = READ_DTO[kind].model_validate(response.json())
    assert copy.source_annotation_id == own_id
    assert copy.source_user_id == project["user"].id
    assert copy.source_code_id == project["code_b"].id


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_create_copy_ignores_client_sent_source_user_and_code(
    client: TestClient, provenance_project, kind: AnnotationKind
) -> None:
    """`source_user_id` and `source_code_id` are not part of the create body: the
    server derives them from the source annotation."""
    annotations = provenance_project[kind]
    payload = create_payload(
        kind,
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )
    payload["source_user_id"] = provenance_project["user"].id
    payload["source_code_id"] = provenance_project["code_b"].id

    response = client.put(f"/{kind}", json=payload)

    assert response.status_code == 200, response.text
    copy = READ_DTO[kind].model_validate(response.json())
    assert copy.source_user_id == provenance_project["assistant"].id
    assert copy.source_code_id == provenance_project["code_a"].id


# --- B. invalid sources ---------------------------------------------------------------
# A source must annotate the same document of the same project (HTTP 400); a single
# copy of a source that does not exist is not found (HTTP 404), because nothing is
# left to create. Nothing is created in either case.


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
@pytest.mark.parametrize(
    "source_key,expected_status",
    [
        # the source annotates another document of the same project
        pytest.param("other_sdoc_source_id", 400, id="other-document"),
        # the source belongs to another project of the same user
        pytest.param("other_project_source_id", 400, id="other-project"),
    ],
)
def test_create_copy_of_invalid_source_is_rejected(
    client: TestClient,
    provenance_project,
    kind: AnnotationKind,
    source_key: str,
    expected_status: int,
) -> None:
    """A copy of a source from another document or project is rejected."""
    annotations = provenance_project[kind]
    source_id = annotations[source_key]
    payload = create_payload(
        kind,
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=source_id,
    )

    response = client.put(f"/{kind}", json=payload)

    assert response.status_code == expected_status, response.text
    assert f"Annotation {source_id} cannot be copied" in response.text
    assert (
        get_user_annotation_ids(
            client, kind, annotations["sdoc_id"], provenance_project["user"].id
        )
        == set()
    )


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_create_copy_of_nonexistent_source_is_not_found(
    client: TestClient, provenance_project, kind: AnnotationKind
) -> None:
    """A single copy of a source that does not exist (e.g. deleted after the
    comparison was opened) is skipped, so the request fails with 404."""
    annotations = provenance_project[kind]
    payload = create_payload(
        kind,
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=999_999,
    )

    response = client.put(f"/{kind}", json=payload)

    assert response.status_code == 404, response.text
    assert (
        get_user_annotation_ids(
            client, kind, annotations["sdoc_id"], provenance_project["user"].id
        )
        == set()
    )


# ===========================================================================
# BULK CREATE ANNOTATIONS (/span/bulk/create, /sentence/bulk/create) TESTS
# ===========================================================================
# BBox annotations have no bulk create endpoint.

BULK_KINDS: list[AnnotationKind] = ["span", "sentence"]


@pytest.mark.parametrize("kind", BULK_KINDS)
def test_create_bulk_records_provenance_of_every_copy(
    client: TestClient, provenance_project, kind: AnnotationKind
) -> None:
    """ "Apply all": a bulk create of two copies and one own annotation records the
    provenance of both copies, in the order of the request, and copies only the
    memos of the source that has memos."""
    annotations = provenance_project[kind]
    code_a_id = provenance_project["code_a"].id
    payload = [
        create_payload(
            kind,
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=0,
            source_annotation_id=annotations["source_id"],
        ),
        create_payload(
            kind,
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=1,
            source_annotation_id=annotations["source_plain_id"],
        ),
        create_payload(
            kind, sdoc_id=annotations["sdoc_id"], code_id=code_a_id, position=2
        ),
    ]

    response = client.put(f"/{kind}/bulk/create", json=payload)

    assert response.status_code == 200, response.text
    results = [READ_DTO[kind].model_validate(item) for item in response.json()]
    assert [result.source_annotation_id for result in results] == [
        annotations["source_id"],
        annotations["source_plain_id"],
        None,
    ]
    assert [result.source_user_id for result in results] == [
        provenance_project["assistant"].id,
        provenance_project["assistant"].id,
        None,
    ]
    assert [result.source_code_id for result in results] == [code_a_id, code_a_id, None]
    assert [len(result.memo_ids) for result in results] == [2, 0, 0]


@pytest.mark.parametrize("kind", BULK_KINDS)
def test_create_bulk_copies_of_same_source_each_get_memo_copies(
    client: TestClient, provenance_project, kind: AnnotationKind
) -> None:
    """Copying the same source twice in one batch gives each copy its own memo
    copies."""
    annotations = provenance_project[kind]
    payload = [
        create_payload(
            kind,
            sdoc_id=annotations["sdoc_id"],
            code_id=code_id,
            position=0,
            source_annotation_id=annotations["source_id"],
        )
        for code_id in [
            provenance_project["code_a"].id,
            provenance_project["code_b"].id,
        ]
    ]

    response = client.put(f"/{kind}/bulk/create", json=payload)

    assert response.status_code == 200, response.text
    results = [READ_DTO[kind].model_validate(item) for item in response.json()]
    assert [len(result.memo_ids) for result in results] == [2, 2]
    assert not set(results[0].memo_ids) & set(results[1].memo_ids)


@pytest.mark.parametrize("kind", BULK_KINDS)
def test_create_bulk_skips_copies_of_nonexistent_sources(
    client: TestClient, provenance_project, kind: AnnotationKind
) -> None:
    """ "Apply all" on a stale comparison: a copy whose source was deleted in the
    meantime is skipped silently, the other copy and the own annotation of the batch
    are still created."""
    annotations = provenance_project[kind]
    code_a_id = provenance_project["code_a"].id
    payload = [
        create_payload(
            kind,
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=0,
            source_annotation_id=999_999,
        ),
        create_payload(
            kind,
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=1,
            source_annotation_id=annotations["source_id"],
        ),
        create_payload(
            kind, sdoc_id=annotations["sdoc_id"], code_id=code_a_id, position=0
        ),
    ]

    response = client.put(f"/{kind}/bulk/create", json=payload)

    assert response.status_code == 200, response.text
    results = [READ_DTO[kind].model_validate(item) for item in response.json()]
    assert [result.source_annotation_id for result in results] == [
        annotations["source_id"],
        None,
    ]
    assert get_user_annotation_ids(
        client, kind, annotations["sdoc_id"], provenance_project["user"].id
    ) == {result.id for result in results}


@pytest.mark.parametrize("kind", BULK_KINDS)
def test_create_bulk_with_one_invalid_source_creates_nothing(
    client: TestClient, provenance_project, kind: AnnotationKind
) -> None:
    """One source from another document rejects the whole batch."""
    annotations = provenance_project[kind]
    code_a_id = provenance_project["code_a"].id
    payload = [
        create_payload(
            kind,
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=0,
            source_annotation_id=annotations["source_id"],
        ),
        create_payload(
            kind,
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=1,
            source_annotation_id=annotations["other_sdoc_source_id"],
        ),
    ]

    response = client.put(f"/{kind}/bulk/create", json=payload)

    assert response.status_code == 400, response.text
    assert (
        get_user_annotation_ids(
            client, kind, annotations["sdoc_id"], provenance_project["user"].id
        )
        == set()
    )


# ===========================================================================
# DELETE THE SOURCE (/span, /sentence, /bbox, /code, /user) TESTS
# ===========================================================================
# The provenance columns are ON DELETE SET NULL: deleting the source annotation, its
# user or its code clears only that column of the copy and keeps the rest.


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_delete_source_annotation_keeps_source_user_and_code_of_copy(
    client: TestClient, provenance_project_with_copies, kind: AnnotationKind
) -> None:
    """Deleting the source annotation clears the copy's `source_annotation_id`; the
    snapshot of its user and code stays."""
    project = provenance_project_with_copies
    copy_id = project[f"{kind}_copies"]["copy_id"]

    response = client.delete(f"/{kind}/{project[kind]['source_id']}")

    assert response.status_code == 200, response.text
    copy = get_annotation(client, kind, copy_id)
    assert copy.source_annotation_id is None
    assert copy.source_user_id == project["assistant"].id
    assert copy.source_code_id == project["code_a"].id


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_delete_source_code_keeps_source_user_of_copy(
    client: TestClient, provenance_project_with_copies, kind: AnnotationKind
) -> None:
    """Deleting "Code A" deletes the source annotation (it has Code A) and clears
    both the copy's `source_annotation_id` and `source_code_id`; the copy (Code B)
    and its source user stay."""
    project = provenance_project_with_copies
    copy_id = project[f"{kind}_copies"]["copy_id"]

    response = client.delete(f"/code/{project['code_a'].id}")

    assert response.status_code == 200, response.text
    copy = get_annotation(client, kind, copy_id)
    assert copy.code_id == project["code_b"].id
    assert copy.source_annotation_id is None
    assert copy.source_user_id == project["assistant"].id
    assert copy.source_code_id is None


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_delete_source_user_keeps_source_code_of_copy(
    client: TestClient,
    app_client: TestClient,
    provenance_project_with_copies,
    kind: AnnotationKind,
) -> None:
    """The assistant deleting their account deletes their annotations and clears the
    copy's `source_annotation_id` and `source_user_id`; the source code stays."""
    project = provenance_project_with_copies
    copy_id = project[f"{kind}_copies"]["copy_id"]
    assistant_client = create_user_client(app_client, project["assistant"])

    response = assistant_client.delete("/user/")

    assert response.status_code == 200, response.text
    copy = get_annotation(client, kind, copy_id)
    assert copy.source_annotation_id is None
    assert copy.source_user_id is None
    assert copy.source_code_id == project["code_a"].id


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
