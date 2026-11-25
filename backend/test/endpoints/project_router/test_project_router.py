"""Every route under /projects/{project_id} reads its ids within the project of the
path: an id of another project answers 404, also for a user who is a member of
both projects, and a filter id of another project matches nothing."""

import re
from typing import Any, Callable

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from composite_keys_test_utils import TenantRows, TwoTenants

PROJECT_PREFIX = "/projects/{project_id}"

# the row of a tenant that a path parameter names
PATH_IDS: dict[str, Callable[[TenantRows], int]] = {
    "span_annotation_id": lambda rows: rows["span"].id,
    "sentence_annotation_id": lambda rows: rows["sentence"].id,
    "bbox_annotation_id": lambda rows: rows["bbox"].id,
    "span_group_id": lambda rows: rows["span_group"].id,
}

# a valid body (with ids of the path's project) for the routes with a path id and a
# body, by "<METHOD> <path>"
BODIES: dict[str, Callable[[TenantRows], Any]] = {
    "PATCH /projects/{project_id}/span-annotations/{span_annotation_id}": (
        lambda rows: {"code_id": rows["code"].id}
    ),
    "PATCH /projects/{project_id}/sentence-annotations/{sentence_annotation_id}": (
        lambda rows: {"code_id": rows["code"].id}
    ),
    "PATCH /projects/{project_id}/bbox-annotations/{bbox_annotation_id}": (
        lambda rows: {"code_id": rows["code"].id}
    ),
}

# per annotation route group: the fixture row of its resource, the id field of its
# bulk update DTO and the position fields of a create DTO
ANNOTATION_GROUPS: dict[str, tuple[str, str, dict[str, Any]]] = {
    "span-annotations": (
        "span",
        "span_annotation_id",
        {"begin": 0, "end": 4, "begin_token": 0, "end_token": 1, "span_text": "text"},
    ),
    "sentence-annotations": (
        "sentence",
        "sentence_annotation_id",
        {"sentence_id_start": 0, "sentence_id_end": 0},
    ),
    "bbox-annotations": (
        "bbox",
        "bbox_annotation_id",
        {"x_min": 0, "x_max": 10, "y_min": 0, "y_max": 10},
    ),
}


def _project_routes(client: TestClient) -> list[tuple[str, APIRoute]]:
    """The routes of the app the client runs (its lifespan mounts the routers)."""
    return [
        (method, route)
        for route in client.app.routes  # type: ignore[attr-defined]
        if isinstance(route, APIRoute) and route.path.startswith(PROJECT_PREFIX)
        for method in sorted(route.methods or ())
    ]


def _path_params(route: APIRoute) -> list[str]:
    return [name for name in re.findall(r"{(\w+)}", route.path) if name != "project_id"]


# ===========================================================================
# ALL PROJECT ROUTES: PATH IDS
# ===========================================================================


def test_every_project_route_is_covered(client: TestClient) -> None:
    """Every path id of a project route is in PATH_IDS, and every route with a path
    id and a body has a body in BODIES, so a new route is covered by the tests
    below."""
    routes = _project_routes(client)
    assert routes, "no route under /projects/{project_id}"
    for method, route in routes:
        for name in _path_params(route):
            assert name in PATH_IDS, f"{method} {route.path}: add {name} to PATH_IDS"
        if _path_params(route) and route.body_field is not None:
            assert f"{method} {route.path}" in BODIES, (
                f"{method} {route.path}: add a body to BODIES"
            )


def test_path_id_of_another_project_is_not_found(
    client: TestClient, tenants: TwoTenants
) -> None:
    """Every project route answers 404 when one of its path ids belongs to the other
    project and the others to the path's project; the user is a member of both."""
    own, foreign = tenants["own"], tenants["foreign"]
    failures: list[str] = []
    routes = _project_routes(client)
    assert routes, "no route under /projects/{project_id}"
    for method, route in routes:
        names = _path_params(route)
        body = BODIES.get(f"{method} {route.path}")
        for foreign_name in names:
            values = {
                name: PATH_IDS[name](foreign if name == foreign_name else own)
                for name in names
            }
            url = route.path.format(project_id=own["project"].id, **values)
            response = client.request(
                method, url, json=body(own) if body is not None else None
            )
            if response.status_code != 404:
                failures.append(
                    f"{method} {url} ({foreign_name} foreign): "
                    f"{response.status_code} {response.text[:200]}"
                )
    assert not failures, "\n".join(failures)


# ===========================================================================
# ANNOTATION ROUTES: BODY AND QUERY IDS
# ===========================================================================


@pytest.mark.parametrize("group", list(ANNOTATION_GROUPS))
@pytest.mark.parametrize("foreign_field", ["code_id", "sdoc_id"])
def test_create_with_a_body_id_of_another_project_is_not_found(
    client: TestClient, tenants: TwoTenants, group: str, foreign_field: str
) -> None:
    """Creating an annotation (single and bulk) with the code or the document of the
    other project answers 404."""
    own, foreign = tenants["own"], tenants["foreign"]
    body = {
        **ANNOTATION_GROUPS[group][2],
        "code_id": (foreign if foreign_field == "code_id" else own)["code"].id,
        "sdoc_id": (foreign if foreign_field == "sdoc_id" else own)["sdoc"].id,
    }
    url = f"/projects/{own['project'].id}/{group}"

    response = client.put(url, json=body)
    assert response.status_code == 404, response.text

    response = client.put(f"{url}/bulk", json=[body])
    assert response.status_code == 404, response.text


@pytest.mark.parametrize("group", list(ANNOTATION_GROUPS))
def test_bulk_ids_of_another_project_are_not_found(
    client: TestClient, tenants: TwoTenants, group: str
) -> None:
    """The bulk update and the bulk delete answer 404 for an annotation of the other
    project."""
    own, foreign = tenants["own"], tenants["foreign"]
    row, id_field, _ = ANNOTATION_GROUPS[group]
    url = f"/projects/{own['project'].id}/{group}/bulk"

    response = client.patch(
        url, json=[{id_field: foreign[row].id, "code_id": own["code"].id}]
    )
    assert response.status_code == 404, response.text

    response = client.request("DELETE", url, json=[foreign[row].id])
    assert response.status_code == 404, response.text


@pytest.mark.parametrize("group", list(ANNOTATION_GROUPS))
def test_filter_id_of_another_project_matches_nothing(
    client: TestClient, tenants: TwoTenants, test_user, group: str
) -> None:
    """Filtering the annotations of the path's project by a document of the other
    project returns no annotation, while the own document returns the own one."""
    own, foreign = tenants["own"], tenants["foreign"]
    row = ANNOTATION_GROUPS[group][0]
    url = f"/projects/{own['project'].id}/{group}"

    response = client.get(
        url, params={"user_id": test_user.id, "sdoc_id": own["sdoc"].id}
    )
    assert response.status_code == 200, response.text
    assert [anno["id"] for anno in response.json()] == [own[row].id]

    response = client.get(
        url, params={"user_id": test_user.id, "sdoc_id": foreign["sdoc"].id}
    )
    assert response.status_code == 200, response.text
    assert response.json() == []
