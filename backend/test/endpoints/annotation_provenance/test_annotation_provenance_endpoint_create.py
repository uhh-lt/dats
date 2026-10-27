import pytest
from fastapi.testclient import TestClient

from .provenance_utils import (
    ANNOTATION_KINDS,
    READ_DTO,
    AnnotationKind,
    create_payload,
    get_annotation,
    get_memos,
    get_user_annotation_ids,
)

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
# A source must annotate the same document of the same project (HTTP 400); a source
# that does not exist is not found (HTTP 404). Nothing is created in either case.


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
    """A copy of a source that does not exist fails with 404."""
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
