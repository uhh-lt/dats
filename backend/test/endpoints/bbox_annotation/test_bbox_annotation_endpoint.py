import pytest
from fastapi.testclient import TestClient

from composite_keys_test_utils import TwoTenants
from core.annotation.bbox_annotation_dto import (
    BBoxAnnotationCreate,
    BBoxAnnotationRead,
    BBoxAnnotationUpdate,
    BBoxAnnotationUpdateBulk,
)
from provenance_test_utils import (
    annotation_route,
    create_payload,
    get_annotation,
    get_memos,
    get_user_annotation_ids,
)


def _url(project_id: int, suffix: str = "") -> str:
    return f"{annotation_route('bbox', project_id)}{suffix}"


# ===========================================================================
# CREATE BBOX ANNOTATION (PUT /projects/{project_id}/bbox-annotations) TESTS
# ===========================================================================
# --- A. creating -----------------------------------------------------------------------


def test_create_bbox_annotation(
    client: TestClient, project_with_bbox_annotation, test_user
) -> None:
    """A new annotation belongs to the current user and has the sent box."""
    project = project_with_bbox_annotation["project"]
    payload = BBoxAnnotationCreate(
        x_min=11,
        x_max=15,
        y_min=12,
        y_max=16,
        code_id=project_with_bbox_annotation["code"].id,
        sdoc_id=project_with_bbox_annotation["source_document"].id,
    )

    response = client.put(_url(project.id), json=payload.model_dump())

    assert response.status_code == 200, response.text
    created = BBoxAnnotationRead.model_validate(response.json())
    assert created.user_id == test_user.id
    assert created.sdoc_id == payload.sdoc_id
    assert created.code_id == payload.code_id
    assert (created.x_min, created.x_max, created.y_min, created.y_max) == (
        11,
        15,
        12,
        16,
    )
    assert get_annotation(client, "bbox", project.id, created.id) == created


@pytest.mark.parametrize(
    "foreign_key",
    [
        # the code belongs to the other project of the user
        pytest.param("code", id="code-of-other-project"),
        # the document belongs to the other project of the user
        pytest.param("sdoc", id="sdoc-of-other-project"),
    ],
)
def test_create_bbox_annotation_with_id_of_other_project_is_not_found(
    client: TestClient, two_tenants: TwoTenants, foreign_key: str
) -> None:
    """A code or document of another project does not exist in the project of
    the path, also when the user is a member of both; nothing is created."""
    own = two_tenants["own"]
    foreign = two_tenants["foreign"]
    project_id = own["project"].id
    payload = BBoxAnnotationCreate(
        x_min=11,
        x_max=15,
        y_min=12,
        y_max=16,
        code_id=(foreign if foreign_key == "code" else own)["code"].id,
        sdoc_id=(foreign if foreign_key == "sdoc" else own)["sdoc"].id,
    )

    response = client.put(_url(project_id), json=payload.model_dump())

    assert response.status_code == 404, response.text
    assert get_user_annotation_ids(
        client, "bbox", project_id, own["sdoc"].id, own["adoc"].user_id
    ) == {own["bbox"].id}


# --- B. copies record their provenance --------------------------------------------------


def test_create_copy_records_source_annotation_user_and_code(
    client: TestClient, provenance_project
) -> None:
    """A copy stores its source annotation and the source's user and code; it
    belongs to the copying user, with the code the client sent."""
    project_id = provenance_project["project"].id
    annotations = provenance_project["bbox"]
    payload = create_payload(
        "bbox",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_b"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )

    response = client.put(_url(project_id), json=payload)

    assert response.status_code == 200, response.text
    copy = BBoxAnnotationRead.model_validate(response.json())
    assert copy.user_id == provenance_project["user"].id
    assert copy.code_id == provenance_project["code_b"].id
    assert copy.source_annotation_id == annotations["source_id"]
    assert copy.source_user_id == provenance_project["assistant"].id
    assert copy.source_code_id == provenance_project["code_a"].id


def test_create_copy_is_created_after_its_source(
    client: TestClient, provenance_project
) -> None:
    """The copy time is the copy's own `created`, not the source's."""
    project_id = provenance_project["project"].id
    annotations = provenance_project["bbox"]
    source = get_annotation(client, "bbox", project_id, annotations["source_id"])
    payload = create_payload(
        "bbox",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )

    response = client.put(_url(project_id), json=payload)

    assert response.status_code == 200, response.text
    copy = BBoxAnnotationRead.model_validate(response.json())
    assert copy.created > source.created


def test_create_copy_copies_memos_of_source_with_their_authors(
    client: TestClient, provenance_project
) -> None:
    """The source's memos are copied onto the copy: new memos with the same title,
    icon and content, still authored by their original authors. The source keeps
    its own memos."""
    project_id = provenance_project["project"].id
    annotations = provenance_project["bbox"]
    source_memos = annotations["source_memos"]
    payload = create_payload(
        "bbox",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )

    response = client.put(_url(project_id), json=payload)

    assert response.status_code == 200, response.text
    copy = BBoxAnnotationRead.model_validate(response.json())
    copied_memos = get_memos(client, "bbox", project_id, copy.id)
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
        for memo in get_memos(client, "bbox", project_id, annotations["source_id"])
    } == {memo.id for memo in source_memos}


def test_create_copy_of_source_without_memos_has_no_memos(
    client: TestClient, provenance_project
) -> None:
    """Copying a source without memos records the provenance and creates no memo."""
    project_id = provenance_project["project"].id
    annotations = provenance_project["bbox"]
    payload = create_payload(
        "bbox",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=1,
        source_annotation_id=annotations["source_plain_id"],
    )

    response = client.put(_url(project_id), json=payload)

    assert response.status_code == 200, response.text
    copy = BBoxAnnotationRead.model_validate(response.json())
    assert copy.source_annotation_id == annotations["source_plain_id"]
    assert copy.memo_ids == []


def test_create_own_annotation_has_no_provenance(
    client: TestClient, provenance_project
) -> None:
    """An annotation created without a source has no provenance."""
    project_id = provenance_project["project"].id
    annotations = provenance_project["bbox"]
    payload = create_payload(
        "bbox",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=2,
    )

    response = client.put(_url(project_id), json=payload)

    assert response.status_code == 200, response.text
    annotation = BBoxAnnotationRead.model_validate(response.json())
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
    own_id = project["bbox_copies"]["own_id"]
    payload = create_payload(
        "bbox",
        sdoc_id=project["bbox"]["sdoc_id"],
        code_id=project["code_a"].id,
        position=1,
        source_annotation_id=own_id,
    )

    response = client.put(_url(project["project"].id), json=payload)

    assert response.status_code == 200, response.text
    copy = BBoxAnnotationRead.model_validate(response.json())
    assert copy.source_annotation_id == own_id
    assert copy.source_user_id == project["user"].id
    assert copy.source_code_id == project["code_b"].id


def test_create_copy_ignores_client_sent_source_user_and_code(
    client: TestClient, provenance_project
) -> None:
    """`source_user_id` and `source_code_id` are not part of the create body: the
    server derives them from the source annotation."""
    project_id = provenance_project["project"].id
    annotations = provenance_project["bbox"]
    payload = create_payload(
        "bbox",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=annotations["source_id"],
    )
    payload["source_user_id"] = provenance_project["user"].id
    payload["source_code_id"] = provenance_project["code_b"].id

    response = client.put(_url(project_id), json=payload)

    assert response.status_code == 200, response.text
    copy = BBoxAnnotationRead.model_validate(response.json())
    assert copy.source_user_id == provenance_project["assistant"].id
    assert copy.source_code_id == provenance_project["code_a"].id


# --- C. invalid sources -------------------------------------------------------------------
# A source must annotate the same document (HTTP 400); a single copy of a source that
# does not exist in the project of the path is not found (HTTP 404), because nothing
# is left to create. Nothing is created in either case.


def test_create_copy_of_source_on_other_document_is_rejected(
    client: TestClient, provenance_project
) -> None:
    """A copy of a source on another document of the project is rejected."""
    project_id = provenance_project["project"].id
    annotations = provenance_project["bbox"]
    source_id = annotations["other_sdoc_source_id"]
    payload = create_payload(
        "bbox",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=source_id,
    )

    response = client.put(_url(project_id), json=payload)

    assert response.status_code == 400, response.text
    assert f"Annotation {source_id} cannot be copied" in response.text
    assert (
        get_user_annotation_ids(
            client,
            "bbox",
            project_id,
            annotations["sdoc_id"],
            provenance_project["user"].id,
        )
        == set()
    )


@pytest.mark.parametrize(
    "source_key",
    [
        # the source was deleted (e.g. after the comparison was opened)
        pytest.param(None, id="nonexistent"),
        # the source belongs to another project of the same user
        pytest.param("other_project_source_id", id="other-project"),
    ],
)
def test_create_copy_of_source_outside_the_project_is_not_found(
    client: TestClient, provenance_project, source_key: str | None
) -> None:
    """A single copy of a source that does not exist in the project of the path is
    skipped, so the request fails with 404."""
    project_id = provenance_project["project"].id
    annotations = provenance_project["bbox"]
    source_id = annotations[source_key] if source_key else 999_999
    payload = create_payload(
        "bbox",
        sdoc_id=annotations["sdoc_id"],
        code_id=provenance_project["code_a"].id,
        position=0,
        source_annotation_id=source_id,
    )

    response = client.put(_url(project_id), json=payload)

    assert response.status_code == 404, response.text
    assert (
        get_user_annotation_ids(
            client,
            "bbox",
            project_id,
            annotations["sdoc_id"],
            provenance_project["user"].id,
        )
        == set()
    )


# ===========================================================================
# GET BBOX ANNOTATIONS (GET /projects/{project_id}/bbox-annotations) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "sdoc_key,code_key,expected_keys",
    [
        # no filter: every annotation of the user
        pytest.param(
            None,
            None,
            {"bbox_annotation", "bbox_annotation2", "bbox_annotation3"},
            id="user",
        ),
        # the two annotations on "Test Image.jpg"
        pytest.param(
            "source_document",
            None,
            {"bbox_annotation", "bbox_annotation2"},
            id="user-sdoc",
        ),
        # the two annotations with "Test Code"
        pytest.param(
            None, "code", {"bbox_annotation", "bbox_annotation3"}, id="user-code"
        ),
        # both filters at once
        pytest.param(
            "source_document", "code", {"bbox_annotation"}, id="user-sdoc-code"
        ),
        # no annotation of "Test Code 2" on "Second Image.jpg"
        pytest.param("source_document2", "code2", set(), id="no-match"),
    ],
)
def test_get_bbox_annotations_filters_by_user_sdoc_and_code(
    client: TestClient,
    project_with_bbox_annotation,
    test_user,
    sdoc_key: str | None,
    code_key: str | None,
    expected_keys: set[str],
) -> None:
    """The annotations of the user, optionally only those in the document and with
    the code."""
    project = project_with_bbox_annotation
    params: dict[str, int] = {"user_id": test_user.id}
    if sdoc_key:
        params["sdoc_id"] = project[sdoc_key].id
    if code_key:
        params["code_id"] = project[code_key].id

    response = client.get(_url(project["project"].id), params=params)

    assert response.status_code == 200, response.text
    annotations = [BBoxAnnotationRead.model_validate(a) for a in response.json()]
    assert {a.id for a in annotations} == {project[key].id for key in expected_keys}


def test_get_bbox_annotations_requires_user(
    client: TestClient, project_with_bbox_annotation
) -> None:
    """`user_id` is a required query parameter."""
    response = client.get(_url(project_with_bbox_annotation["project"].id))

    assert response.status_code == 422, response.text


@pytest.mark.parametrize(
    "filter_name",
    [
        # the document of the other project
        pytest.param("sdoc_id", id="sdoc-of-other-project"),
        # the code of the other project
        pytest.param("code_id", id="code-of-other-project"),
    ],
)
def test_get_bbox_annotations_with_filter_of_other_project_matches_nothing(
    client: TestClient, two_tenants: TwoTenants, filter_name: str
) -> None:
    """A filter id of another project matches no annotation of the path's
    project, also when the user annotated in both."""
    own = two_tenants["own"]
    foreign = two_tenants["foreign"]
    foreign_id = foreign["sdoc" if filter_name == "sdoc_id" else "code"].id

    response = client.get(
        _url(own["project"].id),
        params={"user_id": own["adoc"].user_id, filter_name: foreign_id},
    )

    assert response.status_code == 200, response.text
    assert response.json() == []


# ===========================================================================
# GET BBOX ANNOTATION (GET /projects/{project_id}/bbox-annotations/{id}) TESTS
# ===========================================================================


def test_get_bbox_annotation_by_id(
    client: TestClient, project_with_bbox_annotation
) -> None:
    """The annotation with its box, code and document."""
    project = project_with_bbox_annotation
    bbox_anno = project["bbox_annotation"]

    response = client.get(_url(project["project"].id, f"/{bbox_anno.id}"))

    assert response.status_code == 200, response.text
    annotation = BBoxAnnotationRead.model_validate(response.json())
    assert annotation.id == bbox_anno.id
    assert annotation.code_id == project["code"].id
    assert annotation.sdoc_id == project["source_document"].id
    assert (annotation.x_min, annotation.x_max, annotation.y_min, annotation.y_max) == (
        1,
        5,
        2,
        6,
    )


def test_get_bbox_annotation_by_id_if_not_exists(
    client: TestClient, test_project
) -> None:
    """An id that does not exist is not found."""
    response = client.get(_url(test_project.id, "/999999"))

    assert response.status_code == 404, response.text


def test_get_bbox_annotation_of_other_project_is_not_found(
    client: TestClient, two_tenants: TwoTenants
) -> None:
    """An annotation of another project does not exist in the project of the
    path, also when the user is a member of both."""
    own_project_id = two_tenants["own"]["project"].id
    foreign_id = two_tenants["foreign"]["bbox"].id

    response = client.get(_url(own_project_id, f"/{foreign_id}"))

    assert response.status_code == 404, response.text


# ===========================================================================
# UPDATE BBOX ANNOTATIONS BULK (PATCH /projects/{project_id}/bbox-annotations/bulk)
# ===========================================================================


def test_update_bbox_annotations_bulk(
    client: TestClient, project_with_bbox_annotation
) -> None:
    """Every annotation gets its new code; the results keep the request order."""
    project = project_with_bbox_annotation
    payload = [
        BBoxAnnotationUpdateBulk(
            bbox_annotation_id=project["bbox_annotation3"].id,
            code_id=project["code2"].id,
        ).model_dump(),
        BBoxAnnotationUpdateBulk(
            bbox_annotation_id=project["bbox_annotation"].id,
            code_id=project["code2"].id,
        ).model_dump(),
    ]

    response = client.patch(_url(project["project"].id, "/bulk"), json=payload)

    assert response.status_code == 200, response.text
    updated = [BBoxAnnotationRead.model_validate(a) for a in response.json()]
    assert [a.id for a in updated] == [
        project["bbox_annotation3"].id,
        project["bbox_annotation"].id,
    ]
    assert all(a.code_id == project["code2"].id for a in updated)


@pytest.mark.parametrize(
    "foreign_key",
    [
        # the annotation belongs to the other project of the user
        pytest.param("bbox", id="annotation-of-other-project"),
        # the new code belongs to the other project of the user
        pytest.param("code", id="code-of-other-project"),
    ],
)
def test_update_bbox_annotations_bulk_with_id_of_other_project_is_not_found(
    client: TestClient, two_tenants: TwoTenants, foreign_key: str
) -> None:
    """An annotation or code of another project does not exist in the project of
    the path; the own annotation keeps its code."""
    own = two_tenants["own"]
    foreign = two_tenants["foreign"]
    project_id = own["project"].id
    payload = [
        BBoxAnnotationUpdateBulk(
            bbox_annotation_id=(foreign if foreign_key == "bbox" else own)["bbox"].id,
            code_id=(foreign if foreign_key == "code" else own)["child_code"].id,
        ).model_dump()
    ]

    response = client.patch(_url(project_id, "/bulk"), json=payload)

    assert response.status_code == 404, response.text
    assert (
        get_annotation(client, "bbox", project_id, own["bbox"].id).code_id
        == own["code"].id
    )


# ===========================================================================
# UPDATE BBOX ANNOTATION (PATCH /projects/{project_id}/bbox-annotations/{id}) TESTS
# ===========================================================================
# --- A. code ------------------------------------------------------------------------------


def test_update_bbox_annotation_code(
    client: TestClient,
    project_with_bbox_annotation,
):
    """The annotation gets the new code and keeps its box."""
    project_id = project_with_bbox_annotation["project"].id
    bbox_anno = project_with_bbox_annotation["bbox_annotation"]
    code2 = project_with_bbox_annotation["code2"]

    payload = {"code_id": code2.id}
    resp = client.patch(_url(project_id, f"/{bbox_anno.id}"), json=payload)

    assert resp.status_code == 200, resp.text
    updated = BBoxAnnotationRead.model_validate(resp.json())
    assert updated.id == bbox_anno.id
    assert updated.code_id == payload["code_id"]
    assert updated.x_min == bbox_anno.x_min
    assert updated.x_max == bbox_anno.x_max
    assert updated.y_min == bbox_anno.y_min
    assert updated.y_max == bbox_anno.y_max


def test_update_bbox_annotation_by_id_if_not_exists(
    client: TestClient, project_with_bbox_annotation
):
    """An id that does not exist is not found."""
    project_id = project_with_bbox_annotation["project"].id
    payload = BBoxAnnotationUpdate(code_id=project_with_bbox_annotation["code2"].id)
    resp = client.patch(
        _url(project_id, "/999999"),
        json=payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 404, resp.text


@pytest.mark.parametrize(
    "foreign_key",
    [
        # the annotation belongs to the other project of the user
        pytest.param("bbox", id="annotation-of-other-project"),
        # the new code belongs to the other project of the user
        pytest.param("code", id="code-of-other-project"),
    ],
)
def test_update_bbox_annotation_with_id_of_other_project_is_not_found(
    client: TestClient, two_tenants: TwoTenants, foreign_key: str
) -> None:
    """An annotation or code of another project does not exist in the project of
    the path; the own annotation keeps its code."""
    own = two_tenants["own"]
    foreign = two_tenants["foreign"]
    project_id = own["project"].id
    bbox_id = (foreign if foreign_key == "bbox" else own)["bbox"].id
    code_id = (foreign if foreign_key == "code" else own)["child_code"].id

    resp = client.patch(_url(project_id, f"/{bbox_id}"), json={"code_id": code_id})

    assert resp.status_code == 404, resp.text
    assert (
        get_annotation(client, "bbox", project_id, own["bbox"].id).code_id
        == own["code"].id
    )


# --- B. resize ------------------------------------------------------------------------------


def test_resize_bbox_annotation(
    client: TestClient,
    db_session,
    project_with_bbox_annotation,
) -> None:
    """A resize sets the new box and keeps the code."""
    project_id = project_with_bbox_annotation["project"].id
    bbox_anno = project_with_bbox_annotation["bbox_annotation"]
    payload = {
        "x_min": 10,
        "x_max": 50,
        "y_min": 20,
        "y_max": 60,
    }

    resp = client.patch(_url(project_id, f"/{bbox_anno.id}"), json=payload)

    assert resp.status_code == 200, resp.text
    updated = BBoxAnnotationRead.model_validate(resp.json())
    assert updated.id == bbox_anno.id
    assert updated.x_min == payload["x_min"]
    assert updated.x_max == payload["x_max"]
    assert updated.y_min == payload["y_min"]
    assert updated.y_max == payload["y_max"]
    assert updated.code_id == bbox_anno.code_id

    db_session.refresh(bbox_anno)
    assert bbox_anno.x_min == payload["x_min"]
    assert bbox_anno.x_max == payload["x_max"]
    assert bbox_anno.y_min == payload["y_min"]
    assert bbox_anno.y_max == payload["y_max"]


def test_resize_bbox_annotation_and_update_code(
    client: TestClient,
    project_with_bbox_annotation,
) -> None:
    """A resize and a new code in one request."""
    project_id = project_with_bbox_annotation["project"].id
    bbox_anno = project_with_bbox_annotation["bbox_annotation"]
    code2 = project_with_bbox_annotation["code2"]
    payload = {
        "code_id": code2.id,
        "x_min": 10,
        "x_max": 50,
        "y_min": 20,
        "y_max": 60,
    }

    resp = client.patch(_url(project_id, f"/{bbox_anno.id}"), json=payload)

    assert resp.status_code == 200, resp.text
    updated = BBoxAnnotationRead.model_validate(resp.json())
    assert updated.id == bbox_anno.id
    assert updated.code_id == payload["code_id"]
    assert updated.x_min == payload["x_min"]
    assert updated.x_max == payload["x_max"]
    assert updated.y_min == payload["y_min"]
    assert updated.y_max == payload["y_max"]


invalid_resize_payloads = [
    pytest.param({"x_min": 10}, id="partial_resize_bundle"),
    pytest.param(
        {"x_min": -1, "x_max": 50, "y_min": 20, "y_max": 60},
        id="negative_coordinate",
    ),
    pytest.param(
        {"x_min": 50, "x_max": 10, "y_min": 20, "y_max": 60},
        id="x_min_larger_than_x_max",
    ),
    pytest.param(
        {"x_min": 10, "x_max": 50, "y_min": 60, "y_max": 20},
        id="y_min_larger_than_y_max",
    ),
    pytest.param(
        {"x_min": None, "x_max": 50, "y_min": 20, "y_max": 60},
        id="null_resize_field",
    ),
    pytest.param({}, id="empty_update"),
]


@pytest.mark.parametrize("payload", invalid_resize_payloads)
def test_resize_bbox_annotation_rejects_invalid_payload(
    client: TestClient,
    project_with_bbox_annotation,
    payload,
) -> None:
    """An incomplete or invalid box is rejected."""
    project_id = project_with_bbox_annotation["project"].id
    bbox_anno = project_with_bbox_annotation["bbox_annotation"]

    resp = client.patch(_url(project_id, f"/{bbox_anno.id}"), json=payload)

    assert resp.status_code == 422, resp.text


def test_resize_bbox_annotation_if_not_exists(
    client: TestClient, project_with_bbox_annotation
) -> None:
    """Resizing an id that does not exist is not found."""
    project_id = project_with_bbox_annotation["project"].id
    payload = {
        "x_min": 10,
        "x_max": 50,
        "y_min": 20,
        "y_max": 60,
    }

    resp = client.patch(_url(project_id, "/999999"), json=payload)

    assert resp.status_code == 404, resp.text


# ===========================================================================
# DELETE BBOX ANNOTATIONS BULK (DELETE /projects/{project_id}/bbox-annotations/bulk)
# ===========================================================================


def test_delete_bbox_annotations_bulk(
    client: TestClient, project_with_bbox_annotation, test_user
) -> None:
    """The annotations are deleted and returned as they were, in the request
    order; the others stay."""
    project = project_with_bbox_annotation
    project_id = project["project"].id
    ids = [project["bbox_annotation2"].id, project["bbox_annotation"].id]

    response = client.request("DELETE", _url(project_id, "/bulk"), json=ids)

    assert response.status_code == 200, response.text
    deleted = [BBoxAnnotationRead.model_validate(a) for a in response.json()]
    assert [a.id for a in deleted] == ids
    assert deleted[0].code_id == project["code2"].id
    response = client.get(_url(project_id), params={"user_id": test_user.id})
    assert {a["id"] for a in response.json()} == {project["bbox_annotation3"].id}


def test_delete_bbox_annotations_bulk_with_annotation_of_other_project_is_not_found(
    client: TestClient, two_tenants: TwoTenants
) -> None:
    """An annotation of another project does not exist in the project of the
    path; nothing is deleted."""
    own = two_tenants["own"]
    project_id = own["project"].id
    ids = [own["bbox"].id, two_tenants["foreign"]["bbox"].id]

    response = client.request("DELETE", _url(project_id, "/bulk"), json=ids)

    assert response.status_code == 404, response.text
    assert (
        get_annotation(client, "bbox", project_id, own["bbox"].id).id == own["bbox"].id
    )


# ===========================================================================
# DELETE BBOX ANNOTATION (DELETE /projects/{project_id}/bbox-annotations/{id}) TESTS
# ===========================================================================
# --- A. deleting ----------------------------------------------------------------------------


def test_delete_bbox_annotation(
    client: TestClient, project_with_bbox_annotation
) -> None:
    """The annotation is deleted and returned as it was."""
    project_id = project_with_bbox_annotation["project"].id
    bbox_anno = project_with_bbox_annotation["bbox_annotation"]

    response = client.delete(_url(project_id, f"/{bbox_anno.id}"))

    assert response.status_code == 200, response.text
    deleted = BBoxAnnotationRead.model_validate(response.json())
    assert deleted.id == bbox_anno.id
    assert deleted.code_id == project_with_bbox_annotation["code"].id
    response = client.get(_url(project_id, f"/{bbox_anno.id}"))
    assert response.status_code == 404, response.text


def test_delete_bbox_annotation_of_other_project_is_not_found(
    client: TestClient, two_tenants: TwoTenants
) -> None:
    """An annotation of another project does not exist in the project of the
    path; it is not deleted."""
    foreign = two_tenants["foreign"]

    response = client.delete(
        _url(two_tenants["own"]["project"].id, f"/{foreign['bbox'].id}")
    )

    assert response.status_code == 404, response.text
    assert (
        get_annotation(client, "bbox", foreign["project"].id, foreign["bbox"].id).id
        == foreign["bbox"].id
    )


# --- B. provenance --------------------------------------------------------------------------
# The provenance columns are ON DELETE SET NULL: deleting the source annotation, its
# user or its code clears only that column of the copy and keeps the rest.


def test_delete_source_annotation_keeps_source_user_and_code_of_copy(
    client: TestClient, provenance_project_with_copies
) -> None:
    """Deleting the source annotation clears the copy's `source_annotation_id`; the
    snapshot of its user and code stays."""
    project = provenance_project_with_copies
    project_id = project["project"].id
    copy_id = project["bbox_copies"]["copy_id"]

    response = client.delete(_url(project_id, f"/{project['bbox']['source_id']}"))

    assert response.status_code == 200, response.text
    copy = get_annotation(client, "bbox", project_id, copy_id)
    assert copy.source_annotation_id is None
    assert copy.source_user_id == project["assistant"].id
    assert copy.source_code_id == project["code_a"].id
