import pytest
from fastapi.testclient import TestClient

from composite_keys_test_utils import TwoTenants
from core.annotation.span_annotation_dto import (
    SpanAnnotationCreate,
    SpanAnnotationDeleted,
    SpanAnnotationRead,
    SpanAnnotationUpdate,
)
from core.project.project_orm import ProjectORM
from provenance_test_utils import (
    annotation_route,
    create_payload,
    get_annotation,
    get_memos,
    get_user_annotation_ids,
)
from virtual_user_test_utils import SENTENCES, VirtualUserProject


def _url(project_id: int) -> str:
    """The route of the span annotations of the project."""
    return annotation_route("span", project_id)


def test_add_span_annotation(
    client: TestClient,
    project_with_span_annotation,
) -> None:
    span_annotation = project_with_span_annotation["span_annotation"]
    sdoc = project_with_span_annotation["source_document"]
    code = project_with_span_annotation["code"]

    assert span_annotation.id > 0
    assert span_annotation.sdoc_id == sdoc.id
    assert span_annotation.code_id == code.id


def test_add_span_annotation_if_not_exists(
    client: TestClient, test_project: ProjectORM
) -> None:
    """A span annotation of a document that does not exist is rejected by the
    composite foreign key of the user's annotation document (409)."""
    fake_id = 3000
    payload = SpanAnnotationCreate(
        sdoc_id=fake_id,
        code_id=fake_id,
        begin=0,
        end=5,
        begin_token=1,
        end_token=50,
        span_text="Span",
    )

    resp = client.put(_url(test_project.id), json=payload.model_dump(exclude_none=True))

    assert resp.status_code == 409, resp.text


def test_add_span_annotations_bulk(
    client: TestClient,
    project_with_span_annotation,
) -> None:
    project = project_with_span_annotation["project"]
    sdoc = project_with_span_annotation["source_document"]
    code = project_with_span_annotation["code"]

    payload = [
        SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=10,
            end=15,
            begin_token=2,
            end_token=3,
            span_text="Span 3",
        ).model_dump(exclude_none=True),
        SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=16,
            end=20,
            begin_token=4,
            end_token=5,
            span_text="Span 4",
        ).model_dump(exclude_none=True),
    ]

    resp = client.put(f"{_url(project.id)}/bulk", json=payload)

    assert resp.status_code == 200, resp.text

    items = [SpanAnnotationRead.model_validate(x) for x in resp.json()]
    assert len(items) == 2
    assert all(i.code_id == code.id and i.sdoc_id == sdoc.id for i in items)
    # results follow the input order and name their project
    assert [i.text for i in items] == ["Span 3", "Span 4"]
    assert all(i.project_id == project.id for i in items)


def test_add_span_annotations_bulk_if_not_exists(
    client: TestClient, test_project: ProjectORM
) -> None:
    """Span annotations of a document that does not exist are rejected by the
    composite foreign key of the user's annotation document (409)."""
    payload = SpanAnnotationCreate(
        sdoc_id=9000,
        code_id=9000,
        begin=0,
        end=5,
        begin_token=1,
        end_token=50,
        span_text="Span",
    )

    resp = client.put(
        f"{_url(test_project.id)}/bulk", json=[payload.model_dump(exclude_none=True)]
    )

    assert resp.status_code == 409, resp.text


# Character and token ends are exclusive, so a span covers begin..end - 1 and
# begin_token..end_token - 1. A span that covers nothing is rejected.
empty_span_positions = [
    # the end token equals the begin token: no token is covered
    pytest.param(
        {"begin": 4, "end": 8, "begin_token": 2, "end_token": 2}, id="empty-tokens"
    ),
    # the end token lies before the begin token
    pytest.param(
        {"begin": 4, "end": 8, "begin_token": 3, "end_token": 2}, id="inverted-tokens"
    ),
    # the end character equals the begin character: no character is covered
    pytest.param(
        {"begin": 4, "end": 4, "begin_token": 1, "end_token": 2}, id="empty-characters"
    ),
]


@pytest.mark.parametrize("positions", empty_span_positions)
def test_add_span_annotation_rejects_empty_span(
    client: TestClient,
    project_with_span_annotation,
    test_user,
    positions: dict[str, int],
) -> None:
    """A span annotation that covers no character or no token is rejected with 400
    and not created."""
    project = project_with_span_annotation["project"]
    sdoc = project_with_span_annotation["source_document"]
    code = project_with_span_annotation["code"]
    payload = SpanAnnotationCreate(
        sdoc_id=sdoc.id, code_id=code.id, span_text="Span", **positions
    )

    resp = client.put(_url(project.id), json=payload.model_dump(exclude_none=True))

    assert resp.status_code == 400, resp.text
    assert "must not be empty" in resp.text
    assert get_user_annotation_ids(
        client, "span", project.id, sdoc.id, test_user.id
    ) == {project_with_span_annotation["span_annotation"].id}


@pytest.mark.parametrize("positions", empty_span_positions)
def test_add_span_annotations_bulk_rejects_an_empty_span(
    client: TestClient,
    project_with_span_annotation,
    test_user,
    positions: dict[str, int],
) -> None:
    """One empty span rejects the whole bulk create with 400; the valid span of the
    batch is not created either."""
    project = project_with_span_annotation["project"]
    sdoc = project_with_span_annotation["source_document"]
    code = project_with_span_annotation["code"]
    payload = [
        SpanAnnotationCreate(
            sdoc_id=sdoc.id,
            code_id=code.id,
            begin=10,
            end=15,
            begin_token=2,
            end_token=3,
            span_text="Span 3",
        ).model_dump(exclude_none=True),
        SpanAnnotationCreate(
            sdoc_id=sdoc.id, code_id=code.id, span_text="Span", **positions
        ).model_dump(exclude_none=True),
    ]

    resp = client.put(f"{_url(project.id)}/bulk", json=payload)

    assert resp.status_code == 400, resp.text
    assert get_user_annotation_ids(
        client, "span", project.id, sdoc.id, test_user.id
    ) == {project_with_span_annotation["span_annotation"].id}


def test_get_by_id(
    client: TestClient,
    project_with_span_annotation,
) -> None:
    project = project_with_span_annotation["project"]
    span_annotation = project_with_span_annotation["span_annotation"]
    sdoc = project_with_span_annotation["source_document"]
    code = project_with_span_annotation["code"]

    resp = client.get(f"{_url(project.id)}/{span_annotation.id}")

    assert resp.status_code == 200, resp.text
    span_read = SpanAnnotationRead.model_validate(resp.json())
    assert span_read.id == span_annotation.id
    assert span_read.code_id == code.id
    assert span_read.sdoc_id == sdoc.id
    assert span_read.begin == span_annotation.begin
    assert span_read.end == span_annotation.end
    assert span_read.begin_token == span_annotation.begin_token
    assert span_read.end_token == span_annotation.end_token


def test_get_by_id_if_id_not_exists(
    client: TestClient, test_project: ProjectORM
) -> None:
    fake_nummer = 3000

    resp = client.get(f"{_url(test_project.id)}/{fake_nummer}")

    assert resp.status_code == 404, resp.text


def test_get_by_id_of_another_project_is_not_found(
    client: TestClient, tenants: TwoTenants
) -> None:
    """The span annotation of another project does not exist in the path's project,
    also when the user is a member of both."""
    own_project = tenants["own"]["project"]
    foreign_span = tenants["foreign"]["span"]

    resp = client.get(f"{_url(own_project.id)}/{foreign_span.id}")

    assert resp.status_code == 404, resp.text


def test_get_by_sdoc_and_user(
    client: TestClient, project_with_span_annotation, test_user
) -> None:
    project = project_with_span_annotation["project"]
    sdoc = project_with_span_annotation["source_document"]
    code = project_with_span_annotation["code"]
    span_annotation = project_with_span_annotation["span_annotation"]

    resp = client.get(
        _url(project.id), params={"user_id": test_user.id, "sdoc_id": sdoc.id}
    )

    assert resp.status_code == 200, resp.text
    assert len(resp.json()) == 1
    span_read = SpanAnnotationRead.model_validate(resp.json()[0])
    assert span_read.sdoc_id == sdoc.id
    assert span_read.code_id == code.id
    assert span_read.begin == span_annotation.begin
    assert span_read.end == span_annotation.end
    assert span_read.begin_token == span_annotation.begin_token
    assert span_read.end_token == span_annotation.end_token


def test_get_by_sdoc_and_user_both_ids_not_exist(
    client: TestClient, test_project: ProjectORM
) -> None:
    """Filter ids that do not exist in the project match nothing."""
    sdoc_id = 99999
    user_id = 99999

    resp = client.get(
        _url(test_project.id), params={"user_id": user_id, "sdoc_id": sdoc_id}
    )

    assert resp.status_code == 200, resp.text
    assert resp.json() == []


test_data_span_update = [
    pytest.param({"code_id": 0}, id="update_code_only"),
]


@pytest.mark.parametrize("payload", test_data_span_update)
def test_update_by_id(
    client: TestClient,
    project_with_span_annotations_for_bulk_test,
    payload,
) -> None:
    project = project_with_span_annotations_for_bulk_test["project"]
    span_annotation = project_with_span_annotations_for_bulk_test["span_annotation"]
    code2 = project_with_span_annotations_for_bulk_test["code2"]
    sdoc = project_with_span_annotations_for_bulk_test["source_document"]

    if "code_id" in payload:
        payload["code_id"] = code2.id

    resp = client.patch(
        f"{_url(project.id)}/{span_annotation.id}",
        json=payload,
    )

    assert resp.status_code == 200, resp.text
    updated = SpanAnnotationRead.model_validate(resp.json())
    assert updated.id == span_annotation.id
    assert updated.code_id == payload.get("code_id", code2.id)
    assert updated.sdoc_id == sdoc.id


def test_resize_span_annotation(
    client: TestClient,
    db_session,
    project_with_span_annotation,
) -> None:
    project = project_with_span_annotation["project"]
    span_annotation = project_with_span_annotation["span_annotation"]
    original_span_text_id = span_annotation.span_text_id
    payload = {
        "begin": 5,
        "end": 24,
        "begin_token": 1,
        "end_token": 5,
        "span_text": "resized annotation text",
    }

    resp = client.patch(f"{_url(project.id)}/{span_annotation.id}", json=payload)

    assert resp.status_code == 200, resp.text
    updated = SpanAnnotationRead.model_validate(resp.json())
    assert updated.begin == payload["begin"]
    assert updated.end == payload["end"]
    assert updated.begin_token == payload["begin_token"]
    assert updated.end_token == payload["end_token"]
    assert updated.text == payload["span_text"]
    assert updated.code_id == span_annotation.code_id

    db_session.refresh(span_annotation)
    assert span_annotation.begin == payload["begin"]
    assert span_annotation.end == payload["end"]
    assert span_annotation.begin_token == payload["begin_token"]
    assert span_annotation.end_token == payload["end_token"]
    assert span_annotation.text == payload["span_text"]
    assert span_annotation.span_text_id != original_span_text_id


def test_resize_span_annotation_and_update_code(
    client: TestClient,
    project_with_span_annotations_for_bulk_test,
) -> None:
    project = project_with_span_annotations_for_bulk_test["project"]
    span_annotation = project_with_span_annotations_for_bulk_test["span_annotation"]
    code2 = project_with_span_annotations_for_bulk_test["code2"]
    payload = {
        "code_id": code2.id,
        "begin": 2,
        "end": 18,
        "begin_token": 1,
        "end_token": 4,
        "span_text": "combined update",
    }

    resp = client.patch(f"{_url(project.id)}/{span_annotation.id}", json=payload)

    assert resp.status_code == 200, resp.text
    updated = SpanAnnotationRead.model_validate(resp.json())
    assert updated.code_id == code2.id
    assert updated.begin == payload["begin"]
    assert updated.end == payload["end"]
    assert updated.begin_token == payload["begin_token"]
    assert updated.end_token == payload["end_token"]
    assert updated.text == payload["span_text"]


def test_resize_span_annotation_reuses_span_text(
    client: TestClient,
    db_session,
    project_with_span_annotations_for_bulk_test,
) -> None:
    project = project_with_span_annotations_for_bulk_test["project"]
    span_annotation = project_with_span_annotations_for_bulk_test["span_annotation"]
    span_annotation2 = project_with_span_annotations_for_bulk_test["span_annotation2"]
    payload = {
        "begin": 0,
        "end": 14,
        "begin_token": 0,
        "end_token": 3,
        "span_text": span_annotation.text,
    }

    resp = client.patch(f"{_url(project.id)}/{span_annotation2.id}", json=payload)

    assert resp.status_code == 200, resp.text
    db_session.refresh(span_annotation2)
    assert span_annotation2.span_text_id == span_annotation.span_text_id
    assert span_annotation2.text == span_annotation.text


invalid_resize_payloads = [
    pytest.param({"begin": 1}, id="partial_resize_bundle"),
    pytest.param(
        {
            "begin": -1,
            "end": 4,
            "begin_token": 0,
            "end_token": 1,
            "span_text": "negative character offset",
        },
        id="negative_character_offset",
    ),
    pytest.param(
        {
            "begin": 4,
            "end": 4,
            "begin_token": 1,
            "end_token": 2,
            "span_text": "invalid character range",
        },
        id="empty_character_range",
    ),
    pytest.param(
        {
            "begin": 4,
            "end": 8,
            "begin_token": 2,
            "end_token": 2,
            "span_text": "invalid token range",
        },
        id="empty_token_range",
    ),
    pytest.param(
        {
            "begin": 4,
            "end": 8,
            "begin_token": 1,
            "end_token": 2,
            "span_text": "",
        },
        id="empty_span_text",
    ),
    pytest.param({}, id="empty_update"),
]


@pytest.mark.parametrize("payload", invalid_resize_payloads)
def test_resize_span_annotation_rejects_invalid_payload(
    client: TestClient,
    project_with_span_annotation,
    payload,
) -> None:
    project = project_with_span_annotation["project"]
    span_annotation = project_with_span_annotation["span_annotation"]

    resp = client.patch(f"{_url(project.id)}/{span_annotation.id}", json=payload)

    assert resp.status_code == 422, resp.text


def test_update_by_id_if_not_exists(
    client: TestClient, test_project: ProjectORM
) -> None:
    non_existing_span_anno_id = 9999
    payload = SpanAnnotationUpdate(code_id=1)

    resp = client.patch(
        f"{_url(test_project.id)}/{non_existing_span_anno_id}",
        json=payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 404, resp.text


def test_resize_span_annotation_if_not_exists(
    client: TestClient, test_project: ProjectORM
) -> None:
    payload = {
        "begin": 5,
        "end": 24,
        "begin_token": 1,
        "end_token": 5,
        "span_text": "resized annotation text",
    }

    resp = client.patch(f"{_url(test_project.id)}/9999", json=payload)

    assert resp.status_code == 404, resp.text


def test_update_span_annotations_bulk(
    client: TestClient,
    project_with_span_annotations_for_bulk_test,
) -> None:
    project = project_with_span_annotations_for_bulk_test["project"]
    code2 = project_with_span_annotations_for_bulk_test["code2"]
    span_annotation = project_with_span_annotations_for_bulk_test["span_annotation"]
    span_annotation2 = project_with_span_annotations_for_bulk_test["span_annotation2"]

    payload = [
        {"span_annotation_id": span_annotation.id, "code_id": code2.id},
        {"span_annotation_id": span_annotation2.id, "code_id": code2.id},
    ]
    resp = client.patch(f"{_url(project.id)}/bulk", json=payload)

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert {item["id"]: item["code_id"] for item in body} == {
        span_annotation.id: code2.id,
        span_annotation2.id: code2.id,
    }


def test_update_span_annotations_bulk_keeps_input_order(
    client: TestClient,
    project_with_span_annotations_for_bulk_test,
) -> None:
    project = project_with_span_annotations_for_bulk_test["project"]
    code = project_with_span_annotations_for_bulk_test["code"]
    code2 = project_with_span_annotations_for_bulk_test["code2"]
    span_annotation = project_with_span_annotations_for_bulk_test["span_annotation"]
    span_annotation2 = project_with_span_annotations_for_bulk_test["span_annotation2"]

    # the second annotation (higher id) first, each with its own code
    payload = [
        {"span_annotation_id": span_annotation2.id, "code_id": code2.id},
        {"span_annotation_id": span_annotation.id, "code_id": code.id},
    ]
    resp = client.patch(f"{_url(project.id)}/bulk", json=payload)

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert [(item["id"], item["code_id"]) for item in body] == [
        (span_annotation2.id, code2.id),
        (span_annotation.id, code.id),
    ]


def test_update_span_annotations_bulk_rejects_duplicate_ids(
    client: TestClient,
    project_with_span_annotations_for_bulk_test,
) -> None:
    project = project_with_span_annotations_for_bulk_test["project"]
    code2 = project_with_span_annotations_for_bulk_test["code2"]
    span_annotation = project_with_span_annotations_for_bulk_test["span_annotation"]

    payload = [
        {"span_annotation_id": span_annotation.id, "code_id": code2.id},
        {"span_annotation_id": span_annotation.id, "code_id": code2.id},
    ]
    resp = client.patch(f"{_url(project.id)}/bulk", json=payload)

    assert resp.status_code == 400, resp.text
    assert str(span_annotation.id) in resp.text


def test_update_span_annotations_bulk_not_exists(
    client: TestClient, project_with_span_annotation
) -> None:
    """Span annotations that do not exist in the project are not found."""
    project = project_with_span_annotation["project"]
    code = project_with_span_annotation["code"]
    payload = [
        {"span_annotation_id": 9991, "code_id": code.id},
        {"span_annotation_id": 9992, "code_id": code.id},
    ]

    resp = client.patch(f"{_url(project.id)}/bulk", json=payload)

    assert resp.status_code == 404, resp.text


def test_delete_span_annotation_by_id(
    client: TestClient,
    project_with_span_annotation,
) -> None:
    project = project_with_span_annotation["project"]
    span_annotation = project_with_span_annotation["span_annotation"]
    sdoc = project_with_span_annotation["source_document"]
    code = project_with_span_annotation["code"]

    resp = client.delete(f"{_url(project.id)}/{span_annotation.id}")

    assert resp.status_code == 200, resp.text
    deleted = resp.json()
    assert deleted["id"] == span_annotation.id
    assert deleted["sdoc_id"] == sdoc.id
    assert deleted["code_id"] == code.id
    assert deleted["begin"] == span_annotation.begin
    assert deleted["end"] == span_annotation.end


def test_delete_span_annotation_by_id_if_not_exists(
    client: TestClient, test_project: ProjectORM
) -> None:
    resp = client.delete(f"{_url(test_project.id)}/999999")

    assert resp.status_code == 404, resp.text


def test_delete_span_annotations_bulk(
    client: TestClient,
    project_with_span_annotations_for_bulk_test,
) -> None:
    project = project_with_span_annotations_for_bulk_test["project"]
    span_annotation = project_with_span_annotations_for_bulk_test["span_annotation"]
    span_annotation2 = project_with_span_annotations_for_bulk_test["span_annotation2"]

    resp = client.request(
        "DELETE",
        f"{_url(project.id)}/bulk",
        json=[span_annotation.id, span_annotation2.id],
    )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    returned_ids = {item["id"] for item in body}
    assert returned_ids == {span_annotation.id, span_annotation2.id}


def test_delete_span_annotations_bulk_keeps_input_order(
    client: TestClient,
    project_with_span_annotations_for_bulk_test,
) -> None:
    project = project_with_span_annotations_for_bulk_test["project"]
    span_annotation = project_with_span_annotations_for_bulk_test["span_annotation"]
    span_annotation2 = project_with_span_annotations_for_bulk_test["span_annotation2"]

    resp = client.request(
        "DELETE",
        f"{_url(project.id)}/bulk",
        json=[span_annotation2.id, span_annotation.id],
    )

    assert resp.status_code == 200, resp.text
    deleted = [SpanAnnotationDeleted.model_validate(x) for x in resp.json()]
    assert [d.id for d in deleted] == [span_annotation2.id, span_annotation.id]
    assert [d.begin for d in deleted] == [span_annotation2.begin, span_annotation.begin]


def test_delete_span_annotations_bulk_not_exists(
    client: TestClient, test_project: ProjectORM
) -> None:
    resp = client.request("DELETE", f"{_url(test_project.id)}/bulk", json=[999999])

    assert resp.status_code == 404, resp.text


def test_get_by_user_code(
    client: TestClient,
    project_with_span_annotations_for_count_test,
    test_user,
) -> None:
    project = project_with_span_annotations_for_count_test["project"]
    code = project_with_span_annotations_for_count_test["code"]
    span_annotation = project_with_span_annotations_for_count_test["span_annotation"]
    span_annotation2 = project_with_span_annotations_for_count_test["span_annotation2"]

    resp = client.get(
        _url(project.id), params={"user_id": test_user.id, "code_id": code.id}
    )

    assert resp.status_code == 200, resp.text
    items = resp.json()
    assert {i["id"] for i in items} == {span_annotation.id, span_annotation2.id}
    assert all(i["code_id"] == code.id for i in items)


def test_get_by_user_code_if_not_exists(
    client: TestClient, test_project: ProjectORM, test_user
) -> None:
    """A code that does not exist in the project matches nothing."""
    non_existing_id = 1000

    resp = client.get(
        _url(test_project.id),
        params={"user_id": test_user.id, "code_id": non_existing_id},
    )

    assert resp.status_code == 200, resp.text
    assert resp.json() == []


def test_count_span_annotations(
    client: TestClient, project_with_span_annotations_for_count_test, test_user
) -> None:
    project = project_with_span_annotations_for_count_test["project"]
    sdoc = project_with_span_annotations_for_count_test["source_document"]
    code = project_with_span_annotations_for_count_test["code"]

    payload = {"sdoc_ids": [sdoc.id], "code_ids": [code.id]}
    resp = client.post(
        f"{_url(project.id)}/counts", json={"user_id": test_user.id, **(payload)}
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data.get(str(code.id)) == 2


def test_count_annotation_if_not_exists(
    client: TestClient, test_project: ProjectORM
) -> None:
    """Documents, codes and a user that do not exist in the project count
    nothing."""
    not_existing_id = 2000
    payload = {"sdoc_ids": [not_existing_id], "code_ids": [not_existing_id]}

    resp = client.post(
        f"{_url(test_project.id)}/counts",
        json={"user_id": not_existing_id, **(payload)},
    )

    assert resp.status_code == 200, resp.text
    assert resp.json() == {}


# ===========================================================================
# CREATE SPAN ANNOTATION (/projects/{project_id}/span-annotations) TESTS: PROVENANCE
# ===========================================================================
# --- A. single copies record their provenance --------------------------------------


def test_create_copy_records_source_annotation_user_and_code(
    client: TestClient, provenance_project
) -> None:
    """A copy stores its source annotation and the source's user and code; it
    belongs to the copying user, with the code the client sent."""
    annotations = provenance_project["span"]
    payload = create_payload(
        "span",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_b"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )

    response = client.put(_url(provenance_project["project"].id), json=payload)

    assert response.status_code == 200, response.text
    copy = SpanAnnotationRead.model_validate(response.json())
    assert copy.user_id == provenance_project["user"].id
    assert copy.code_id == provenance_project["code_b"].id
    assert copy.source_annotation_id == annotations["source_id"]
    assert copy.source_user_id == provenance_project["assistant"].id
    assert copy.source_code_id == provenance_project["code_a"].id


def test_create_copy_is_created_after_its_source(
    client: TestClient, provenance_project
) -> None:
    """The copy time is the copy's own `created`, not the source's."""
    annotations = provenance_project["span"]
    source = get_annotation(
        client, "span", provenance_project["project"].id, annotations["source_id"]
    )
    payload = create_payload(
        "span",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )

    response = client.put(_url(provenance_project["project"].id), json=payload)

    assert response.status_code == 200, response.text
    copy = SpanAnnotationRead.model_validate(response.json())
    assert copy.created > source.created


def test_create_copy_copies_memos_of_source_with_their_authors(
    client: TestClient, provenance_project
) -> None:
    """The source's memos are copied onto the copy: new memos with the same title,
    icon and content, still authored by their original authors. The source keeps
    its own memos."""
    annotations = provenance_project["span"]
    source_memos = annotations["source_memos"]
    payload = create_payload(
        "span",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )

    response = client.put(_url(provenance_project["project"].id), json=payload)

    assert response.status_code == 200, response.text
    copy = SpanAnnotationRead.model_validate(response.json())
    copied_memos = get_memos(client, "span", provenance_project["project"].id, copy.id)
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
    assert {
        memo.id
        for memo in get_memos(
            client, "span", provenance_project["project"].id, annotations["source_id"]
        )
    } == {memo.id for memo in source_memos}


def test_create_copy_of_source_without_memos_has_no_memos(
    client: TestClient, provenance_project
) -> None:
    """Copying a source without memos records the provenance and creates no memo."""
    annotations = provenance_project["span"]
    payload = create_payload(
        "span",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=1,
        source_annotation_id=annotations["source_plain_id"],
    )

    response = client.put(_url(provenance_project["project"].id), json=payload)

    assert response.status_code == 200, response.text
    copy = SpanAnnotationRead.model_validate(response.json())
    assert copy.source_annotation_id == annotations["source_plain_id"]
    assert copy.memo_ids == []


def test_create_own_annotation_has_no_provenance(
    client: TestClient, provenance_project
) -> None:
    """An annotation created without a source has no provenance."""
    annotations = provenance_project["span"]
    payload = create_payload(
        "span",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=2,
    )

    response = client.put(_url(provenance_project["project"].id), json=payload)

    assert response.status_code == 200, response.text
    annotation = SpanAnnotationRead.model_validate(response.json())
    assert annotation.source_annotation_id is None
    assert annotation.source_user_id is None
    assert annotation.source_code_id is None
    assert annotation.memo_ids == []


def test_create_copy_of_own_annotation_is_recorded(
    client: TestClient, provenance_project_with_copies
) -> None:
    """Copying one's own annotation (e.g. of an earlier run) records the provenance
    like any other source."""
    project = provenance_project_with_copies
    own_id = project["span_copies"]["own_id"]
    payload = create_payload(
        "span",
        sdoc_id=project["span"]["sdoc_id"],
        code_id=project["code_a"].id,
        position=1,
        source_annotation_id=own_id,
    )

    response = client.put(_url(project["project"].id), json=payload)

    assert response.status_code == 200, response.text
    copy = SpanAnnotationRead.model_validate(response.json())
    assert copy.source_annotation_id == own_id
    assert copy.source_user_id == project["user"].id
    assert copy.source_code_id == project["code_b"].id


def test_create_copy_ignores_client_sent_source_user_and_code(
    client: TestClient, provenance_project
) -> None:
    """`source_user_id` and `source_code_id` are not part of the create body: the
    server derives them from the source annotation."""
    annotations = provenance_project["span"]
    payload = create_payload(
        "span",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )
    payload["source_user_id"] = provenance_project["user"].id
    payload["source_code_id"] = provenance_project["code_b"].id

    response = client.put(_url(provenance_project["project"].id), json=payload)

    assert response.status_code == 200, response.text
    copy = SpanAnnotationRead.model_validate(response.json())
    assert copy.source_user_id == provenance_project["assistant"].id
    assert copy.source_code_id == provenance_project["code_a"].id


# --- B. invalid sources ---------------------------------------------------------------
# A source must annotate the same document (HTTP 400); a single copy of a source that
# does not exist in the project (deleted, or of another project) is not found (HTTP
# 404), because nothing is left to create. Nothing is created in either case.


def test_create_copy_of_source_of_another_document_is_rejected(
    client: TestClient, provenance_project
) -> None:
    """A copy of a source from another document of the project is rejected."""
    annotations = provenance_project["span"]
    source_id = annotations["other_sdoc_source_id"]
    payload = create_payload(
        "span",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=source_id,
    )

    response = client.put(_url(provenance_project["project"].id), json=payload)

    assert response.status_code == 400, response.text
    assert f"Annotation {source_id} cannot be copied" in response.text
    assert (
        get_user_annotation_ids(
            client,
            "span",
            provenance_project["project"].id,
            annotations["sdoc_id"],
            provenance_project["user"].id,
        )
        == set()
    )


@pytest.mark.parametrize(
    "source_key",
    [
        # the source was deleted after the comparison was opened
        pytest.param(None, id="nonexistent"),
        # the source belongs to another project of the same user
        pytest.param("other_project_source_id", id="another-project"),
    ],
)
def test_create_copy_of_source_not_in_project_is_not_found(
    client: TestClient, provenance_project, source_key: str | None
) -> None:
    """A single copy of a source that does not exist in the project is skipped, so
    the request fails with 404."""
    annotations = provenance_project["span"]
    source_id = 999_999
    if source_key is not None:
        source_id = annotations[source_key]  # type: ignore[literal-required]
    payload = create_payload(
        "span",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=source_id,
    )

    response = client.put(_url(provenance_project["project"].id), json=payload)

    assert response.status_code == 404, response.text
    assert (
        get_user_annotation_ids(
            client,
            "span",
            provenance_project["project"].id,
            annotations["sdoc_id"],
            provenance_project["user"].id,
        )
        == set()
    )


# ===========================================================================
# CREATE SPAN ANNOTATION (/projects/{project_id}/span-annotations) TESTS: VIRTUAL USERS
# ===========================================================================


def _virtual_user_span_create(
    project: VirtualUserProject, word: str
) -> SpanAnnotationCreate:
    """A span annotation of one word of the fixture document."""
    content = " ".join(SENTENCES)
    words = content.split(" ")
    begin = content.index(word)
    token = words.index(word)
    return SpanAnnotationCreate(
        sdoc_id=project["sdoc"].id,
        code_id=project["code"].id,
        begin=begin,
        end=begin + len(word),
        begin_token=token,
        end_token=token + 1,
        span_text=word,
    )


def test_create_span_annotation_as_virtual_user(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """A user creates a span annotation owned by a virtual user."""
    run2 = virtual_user_project["run2"]

    response = client.put(
        _url(virtual_user_project["project"].id),
        json={
            **(_virtual_user_span_create(virtual_user_project, "gamma.").model_dump()),
            "user_id": run2.id,
        },
    )

    assert response.status_code == 200, response.text
    assert SpanAnnotationRead.model_validate(response.json()).user_id == run2.id


@pytest.mark.parametrize(
    "params",
    [
        # no user_id: the current user
        pytest.param({}, id="default"),
        # the own id
        pytest.param(None, id="own-id"),
    ],
)
def test_create_span_annotation_as_current_user(
    client: TestClient,
    virtual_user_project: VirtualUserProject,
    params: dict[str, int] | None,
):
    """Without `user_id` or with the own id, the annotation belongs to the current
    user."""
    user = virtual_user_project["user"]

    response = client.put(
        _url(virtual_user_project["project"].id),
        json={
            **(_virtual_user_span_create(virtual_user_project, "zeta.").model_dump()),
            **({"user_id": user.id} if params is None else params),
        },
    )

    assert response.status_code == 200, response.text
    assert SpanAnnotationRead.model_validate(response.json()).user_id == user.id


@pytest.mark.parametrize(
    "user_key",
    [
        # another user (not virtual)
        pytest.param("other_user", id="other-user"),
        # a virtual user of an outsider project
        pytest.param("other_run", id="outsider-virtual-user"),
    ],
)
def test_create_span_annotation_as_other_user_or_outsider_virtual_user_is_forbidden(
    client: TestClient,
    virtual_user_project: VirtualUserProject,
    user_key: str,
):
    """Annotations can only be created as a virtual user of the document's
    project."""
    user = virtual_user_project[user_key]  # type: ignore[literal-required]

    response = client.put(
        _url(virtual_user_project["project"].id),
        json={
            **(_virtual_user_span_create(virtual_user_project, "gamma.").model_dump()),
            "user_id": user.id,
        },
    )

    assert response.status_code == 403, response.text


# ===========================================================================
# BULK CREATE SPAN ANNOTATIONS (/projects/{project_id}/span-annotations/bulk) TESTS: PROVENANCE
# ===========================================================================
def test_create_bulk_records_provenance_of_every_copy(
    client: TestClient, provenance_project
) -> None:
    """ "Apply all": a bulk create of two copies and one own annotation records the
    provenance of both copies, in the order of the request, and copies only the
    memos of the source that has memos."""
    annotations = provenance_project["span"]
    code_a_id = provenance_project["code_a"].id
    payload = [
        create_payload(
            "span",
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=0,
            source_annotation_id=annotations["source_id"],
        ),
        create_payload(
            "span",
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=1,
            source_annotation_id=annotations["source_plain_id"],
        ),
        create_payload(
            "span", sdoc_id=annotations["sdoc_id"], code_id=code_a_id, position=2
        ),
    ]

    response = client.put(
        f"{_url(provenance_project['project'].id)}/bulk", json=payload
    )

    assert response.status_code == 200, response.text
    results = [SpanAnnotationRead.model_validate(item) for item in response.json()]
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


def test_create_bulk_copies_of_same_source_each_get_memo_copies(
    client: TestClient, provenance_project
) -> None:
    """Copying the same source twice in one batch gives each copy its own memo
    copies."""
    annotations = provenance_project["span"]
    payload = [
        create_payload(
            "span",
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

    response = client.put(
        f"{_url(provenance_project['project'].id)}/bulk", json=payload
    )

    assert response.status_code == 200, response.text
    results = [SpanAnnotationRead.model_validate(item) for item in response.json()]
    assert [len(result.memo_ids) for result in results] == [2, 2]
    assert not set(results[0].memo_ids) & set(results[1].memo_ids)


def test_create_bulk_skips_copies_of_nonexistent_sources(
    client: TestClient, provenance_project
) -> None:
    """ "Apply all" on a stale comparison: a copy whose source was deleted in the
    meantime is skipped silently, the other copy and the own annotation of the batch
    are still created."""
    annotations = provenance_project["span"]
    code_a_id = provenance_project["code_a"].id
    payload = [
        create_payload(
            "span",
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=0,
            source_annotation_id=999_999,
        ),
        create_payload(
            "span",
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=1,
            source_annotation_id=annotations["source_id"],
        ),
        create_payload(
            "span", sdoc_id=annotations["sdoc_id"], code_id=code_a_id, position=0
        ),
    ]

    response = client.put(
        f"{_url(provenance_project['project'].id)}/bulk", json=payload
    )

    assert response.status_code == 200, response.text
    results = [SpanAnnotationRead.model_validate(item) for item in response.json()]
    assert [result.source_annotation_id for result in results] == [
        annotations["source_id"],
        None,
    ]
    assert get_user_annotation_ids(
        client,
        "span",
        provenance_project["project"].id,
        annotations["sdoc_id"],
        provenance_project["user"].id,
    ) == {result.id for result in results}


def test_create_bulk_with_one_invalid_source_creates_nothing(
    client: TestClient, provenance_project
) -> None:
    """One source from another document rejects the whole batch."""
    annotations = provenance_project["span"]
    code_a_id = provenance_project["code_a"].id
    payload = [
        create_payload(
            "span",
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=0,
            source_annotation_id=annotations["source_id"],
        ),
        create_payload(
            "span",
            sdoc_id=annotations["sdoc_id"],
            code_id=code_a_id,
            position=1,
            source_annotation_id=annotations["other_sdoc_source_id"],
        ),
    ]

    response = client.put(
        f"{_url(provenance_project['project'].id)}/bulk", json=payload
    )

    assert response.status_code == 400, response.text
    assert (
        get_user_annotation_ids(
            client,
            "span",
            provenance_project["project"].id,
            annotations["sdoc_id"],
            provenance_project["user"].id,
        )
        == set()
    )


# ===========================================================================
# BULK CREATE SPAN ANNOTATIONS (/projects/{project_id}/span-annotations/bulk) TESTS: VIRTUAL USERS
# ===========================================================================


def test_create_span_annotations_bulk_as_virtual_user(
    client: TestClient, virtual_user_project: VirtualUserProject
):
    """Bulk creation annotates all spans as the virtual user."""
    run2 = virtual_user_project["run2"]

    response = client.put(
        f"{_url(virtual_user_project['project'].id)}/bulk",
        json=[
            {
                **_virtual_user_span_create(virtual_user_project, text).model_dump(),
                "user_id": run2.id,
            }
            for text in ("beta", "epsilon")
        ],
    )

    assert response.status_code == 200, response.text
    spans = [SpanAnnotationRead.model_validate(data) for data in response.json()]
    assert [span.user_id for span in spans] == [run2.id, run2.id]


# ===========================================================================
# DELETE SPAN ANNOTATION (/projects/{project_id}/span-annotations/{id}) TESTS: PROVENANCE
# ===========================================================================
# The provenance columns are ON DELETE SET NULL: deleting the source annotation, its
# user or its code clears only that column of the copy and keeps the rest.


def test_delete_source_annotation_keeps_source_user_and_code_of_copy(
    client: TestClient, provenance_project_with_copies
) -> None:
    """Deleting the source annotation clears the copy's `source_annotation_id`; the
    snapshot of its user and code stays."""
    project = provenance_project_with_copies
    copy_id = project["span_copies"]["copy_id"]

    response = client.delete(
        f"{_url(project['project'].id)}/{project['span']['source_id']}"
    )

    assert response.status_code == 200, response.text
    copy = get_annotation(client, "span", project["project"].id, copy_id)
    assert copy.source_annotation_id is None
    assert copy.source_user_id == project["assistant"].id
    assert copy.source_code_id == project["code_a"].id
