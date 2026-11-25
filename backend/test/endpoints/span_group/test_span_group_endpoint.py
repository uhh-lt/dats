from fastapi.testclient import TestClient

from composite_keys_test_utils import TwoTenants
from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.annotation.span_group_dto import (
    SpanGroupCreate,
    SpanGroupRead,
    SpanGroupUpdate,
    SpanGroupWithAnnotationsRead,
)


def _url(project_id: int) -> str:
    """The route of the span groups of the project."""
    return f"/projects/{project_id}/span-groups"


def _group_names(client: TestClient, project_id: int, user_id: int) -> list[str]:
    """The names of the span groups of the user in the project."""
    response = client.get(_url(project_id), params={"user_id": user_id})
    assert response.status_code == 200, response.text
    return [group["name"] for group in response.json()]


# ===========================================================================
# CREATE SPAN GROUP (PUT /projects/{project_id}/span-groups) TESTS
# ===========================================================================


def test_create_span_group_in_a_document_without_annotation_document(
    client: TestClient, two_tenants: TwoTenants, test_user
) -> None:
    """A span group of the current user on a document the user has not annotated
    creates the user's annotation document and belongs to the document and the
    user."""
    own = two_tenants["own"]
    payload = SpanGroupCreate(name="New group", sdoc_id=own["bare_sdoc"].id)

    response = client.put(_url(own["project"].id), json=payload.model_dump())

    assert response.status_code == 200, response.text
    group = SpanGroupRead.model_validate(response.json())
    assert (group.name, group.sdoc_id, group.user_id) == (
        "New group",
        own["bare_sdoc"].id,
        test_user.id,
    )


def test_create_span_group_with_a_document_of_another_project_is_a_conflict(
    client: TestClient, two_tenants: TwoTenants, test_user
) -> None:
    """A document of the other project in the body is rejected by the composite
    foreign key (409), also when the user annotated it there; nothing is
    created."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]
    payload = SpanGroupCreate(name="Foreign group", sdoc_id=foreign["sdoc"].id)

    response = client.put(_url(own["project"].id), json=payload.model_dump())

    assert response.status_code == 409, response.text
    assert _group_names(client, own["project"].id, test_user.id) == [
        own["span_group"].name
    ]


def test_create_span_group_with_a_document_that_does_not_exist_is_not_found(
    client: TestClient, two_tenants: TwoTenants
) -> None:
    """A document that exists in no project has no annotation document (404)."""
    payload = SpanGroupCreate(name="Lost group", sdoc_id=999999)

    response = client.put(
        _url(two_tenants["own"]["project"].id), json=payload.model_dump()
    )

    assert response.status_code == 404, response.text


# ===========================================================================
# GET SPAN GROUPS (GET /projects/{project_id}/span-groups) TESTS
# ===========================================================================


def test_get_span_groups_of_the_user_in_the_document(
    client: TestClient, two_tenants: TwoTenants, test_user
) -> None:
    """The span groups of the user in the document (#903: the document comes from
    the query), each with its span annotations."""
    own = two_tenants["own"]

    response = client.get(
        _url(own["project"].id),
        params={"user_id": test_user.id, "sdoc_id": own["sdoc"].id},
    )

    assert response.status_code == 200, response.text
    [group] = [SpanGroupWithAnnotationsRead.model_validate(g) for g in response.json()]
    assert group.id == own["span_group"].id
    assert [span.id for span in group.span_annotations] == [own["span"].id]


def test_get_span_groups_of_another_document_returns_none(
    client: TestClient, two_tenants: TwoTenants, test_user
) -> None:
    """A document of the project without span groups of the user matches no
    group."""
    own = two_tenants["own"]

    response = client.get(
        _url(own["project"].id),
        params={"user_id": test_user.id, "sdoc_id": own["bare_sdoc"].id},
    )

    assert response.status_code == 200, response.text
    assert response.json() == []


def test_get_span_groups_filtered_by_a_document_of_another_project_match_nothing(
    client: TestClient, two_tenants: TwoTenants, test_user
) -> None:
    """A document of the other project in the filter matches no group, although
    the user has a span group there."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]

    response = client.get(
        _url(own["project"].id),
        params={"user_id": test_user.id, "sdoc_id": foreign["sdoc"].id},
    )

    assert response.status_code == 200, response.text
    assert response.json() == []


def test_get_span_groups_without_document_returns_those_of_the_project(
    client: TestClient, two_tenants: TwoTenants, test_user
) -> None:
    """Without a document filter the user's span groups of the path's project are
    returned, not those of the other project."""
    own = two_tenants["own"]

    assert _group_names(client, own["project"].id, test_user.id) == [
        own["span_group"].name
    ]


def test_get_span_groups_requires_the_user(
    client: TestClient, two_tenants: TwoTenants
) -> None:
    """The user filter is required (422)."""
    response = client.get(_url(two_tenants["own"]["project"].id))

    assert response.status_code == 422, response.text


# ===========================================================================
# GET SPAN GROUP (GET /projects/{project_id}/span-groups/{span_group_id}) TESTS
# ===========================================================================


def test_get_span_group_by_id(client: TestClient, two_tenants: TwoTenants) -> None:
    """The span group of the project with its document and user."""
    own = two_tenants["own"]

    response = client.get(f"{_url(own['project'].id)}/{own['span_group'].id}")

    assert response.status_code == 200, response.text
    group = SpanGroupRead.model_validate(response.json())
    assert (group.id, group.name, group.sdoc_id, group.user_id) == (
        own["span_group"].id,
        own["span_group"].name,
        own["sdoc"].id,
        own["adoc"].user_id,
    )


def test_get_span_group_of_another_project_is_not_found(
    client: TestClient, two_tenants: TwoTenants
) -> None:
    """A span group of the other project does not exist in the path's project
    (404), although the user is a member of both."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]

    response = client.get(f"{_url(own['project'].id)}/{foreign['span_group'].id}")

    assert response.status_code == 404, response.text


# ===========================================================================
# GET SPAN GROUP ANNOTATIONS
# (GET /projects/{project_id}/span-groups/{span_group_id}/span-annotations) TESTS
# ===========================================================================


def test_get_annotations_of_the_span_group(
    client: TestClient, two_tenants: TwoTenants
) -> None:
    """The span annotations the span group contains."""
    own = two_tenants["own"]

    response = client.get(
        f"{_url(own['project'].id)}/{own['span_group'].id}/span-annotations"
    )

    assert response.status_code == 200, response.text
    spans = [SpanAnnotationRead.model_validate(span) for span in response.json()]
    assert [span.id for span in spans] == [own["span"].id]


def test_get_annotations_of_a_span_group_of_another_project_is_not_found(
    client: TestClient, two_tenants: TwoTenants
) -> None:
    """The span group of the other project does not exist in the path's project
    (404)."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]

    response = client.get(
        f"{_url(own['project'].id)}/{foreign['span_group'].id}/span-annotations"
    )

    assert response.status_code == 404, response.text


# ===========================================================================
# UPDATE SPAN GROUP (PATCH /projects/{project_id}/span-groups/{span_group_id}) TESTS
# ===========================================================================


def test_update_span_group_renames_it(
    client: TestClient, two_tenants: TwoTenants
) -> None:
    """The new name is stored and returned."""
    own = two_tenants["own"]
    url = f"{_url(own['project'].id)}/{own['span_group'].id}"

    response = client.patch(url, json=SpanGroupUpdate(name="Renamed").model_dump())

    assert response.status_code == 200, response.text
    assert SpanGroupRead.model_validate(response.json()).name == "Renamed"
    assert client.get(url).json()["name"] == "Renamed"


def test_update_span_group_of_another_project_is_not_found(
    client: TestClient, two_tenants: TwoTenants
) -> None:
    """The span group of the other project is not found (404) and keeps its
    name."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]

    response = client.patch(
        f"{_url(own['project'].id)}/{foreign['span_group'].id}",
        json=SpanGroupUpdate(name="Renamed").model_dump(),
    )

    assert response.status_code == 404, response.text
    response = client.get(f"{_url(foreign['project'].id)}/{foreign['span_group'].id}")
    assert response.json()["name"] == foreign["span_group"].name


# ===========================================================================
# DELETE SPAN GROUP (DELETE /projects/{project_id}/span-groups/{span_group_id}) TESTS
# ===========================================================================


def test_delete_span_group_keeps_its_span_annotations(
    client: TestClient, two_tenants: TwoTenants
) -> None:
    """The span group is returned and gone; its span annotation stays without
    group."""
    own = two_tenants["own"]
    project_id = own["project"].id

    response = client.delete(f"{_url(project_id)}/{own['span_group'].id}")

    assert response.status_code == 200, response.text
    assert SpanGroupRead.model_validate(response.json()).id == own["span_group"].id
    response = client.get(f"{_url(project_id)}/{own['span_group'].id}")
    assert response.status_code == 404, response.text
    response = client.get(f"/projects/{project_id}/span-annotations/{own['span'].id}")
    assert response.status_code == 200, response.text
    assert SpanAnnotationRead.model_validate(response.json()).group_ids == []


def test_delete_span_group_of_another_project_is_not_found(
    client: TestClient, two_tenants: TwoTenants
) -> None:
    """The span group of the other project is not found (404) and stays."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]

    response = client.delete(f"{_url(own['project'].id)}/{foreign['span_group'].id}")

    assert response.status_code == 404, response.text
    response = client.get(f"{_url(foreign['project'].id)}/{foreign['span_group'].id}")
    assert response.status_code == 200, response.text
