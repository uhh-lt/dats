"""Every route under /projects/{project_id} keeps to the project of the path, also
for a user who is a member of both projects: a path id of another project answers
404, a body id of another project in a write is rejected by the composite foreign
key (409), and a filter id of another project matches nothing."""

import re
from typing import Any, Callable

import pytest
from fastapi.routing import APIRoute, iter_route_contexts
from fastapi.testclient import TestClient

from composite_keys_test_utils import TenantRows, TwoTenants
from core.project.project_orm import ProjectORM

from .conftest import TenantJobs

PROJECT_PREFIX = "/projects/{project_id}"

# the path parameter of a job, a job of the type the route names after /jobs/
JOB_ID = "job_id"

# the row of a tenant that a path parameter names
PATH_IDS: dict[str, Callable[[TenantRows], int]] = {
    "span_annotation_id": lambda rows: rows["span"].id,
    "sentence_annotation_id": lambda rows: rows["sentence"].id,
    "bbox_annotation_id": lambda rows: rows["bbox"].id,
    "span_group_id": lambda rows: rows["span_group"].id,
    "code_id": lambda rows: rows["code"].id,
    "tag_id": lambda rows: rows["tag"].id,
    "sdoc_id": lambda rows: rows["sdoc"].id,
    "folder_id": lambda rows: rows["folder"].id,
    "project_metadata_id": lambda rows: rows["project_metadata"].id,
    "sdoc_metadata_id": lambda rows: rows["sdoc_metadata"].id,
    "memo_id": lambda rows: rows["memo"].id,
    "whiteboard_id": lambda rows: rows["whiteboard"].id,
    "timeline_analysis_id": lambda rows: rows["timeline_analysis"].id,
    "cota_id": lambda rows: rows["cota"].id,
    "experiment_id": lambda rows: rows["experiment"].id,
    "run_id": lambda rows: rows["experiment_run"].id,
    "classifier_id": lambda rows: rows["classifier"].id,
    "aspect_id": lambda rows: rows["aspect"].id,
    "cluster_id": lambda rows: rows["cluster"].id,
}

# an empty document filter
_NO_FILTER = {"id": "root", "logic_operator": "and", "items": []}

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
    "PATCH /projects/{project_id}/span-groups/{span_group_id}": (
        lambda rows: {"name": "renamed"}
    ),
    "PATCH /projects/{project_id}/codes/{code_id}": (
        lambda rows: {"description": "changed"}
    ),
    "PATCH /projects/{project_id}/tags/{tag_id}": (
        lambda rows: {"description": "changed"}
    ),
    "PATCH /projects/{project_id}/source-documents/{sdoc_id}": (
        lambda rows: {"name": "renamed"}
    ),
    "PATCH /projects/{project_id}/folders/{folder_id}": (
        lambda rows: {"name": "renamed"}
    ),
    "PATCH /projects/{project_id}/project-metadata/{project_metadata_id}": (
        lambda rows: {"description": "changed"}
    ),
    "PATCH /projects/{project_id}/memos/{memo_id}": (lambda rows: {"title": "x"}),
    "PATCH /projects/{project_id}/whiteboards/{whiteboard_id}": (
        lambda rows: {"title": "renamed"}
    ),
    "PATCH /projects/{project_id}/timeline-analyses/{timeline_analysis_id}": (
        lambda rows: {"name": "renamed"}
    ),
    "PATCH /projects/{project_id}/concept-over-time-analyses/{cota_id}": (
        lambda rows: {"name": "renamed"}
    ),
    "PATCH /projects/{project_id}/concept-over-time-analyses/{cota_id}/annotate": (
        lambda rows: []
    ),
    "PATCH /projects/{project_id}/concept-over-time-analyses/{cota_id}/remove": (
        lambda rows: []
    ),
    "POST /projects/{project_id}/concept-over-time-analyses/{cota_id}/refine": (
        lambda rows: {}
    ),
    "PATCH /projects/{project_id}/experiments/{experiment_id}": (
        lambda rows: {"name": "renamed"}
    ),
    "PATCH /projects/{project_id}/classifiers/{classifier_id}": (
        lambda rows: {"name": "renamed"}
    ),
    "PATCH /projects/{project_id}/perspectives/aspects/{aspect_id}": (
        lambda rows: {"name": "renamed"}
    ),
    "PATCH /projects/{project_id}/perspectives/clusters/{cluster_id}": (
        lambda rows: {"name": "renamed"}
    ),
    "POST /projects/{project_id}/perspectives/aspects/{aspect_id}/visualize": (
        lambda rows: {"filter": _NO_FILTER, "sorts": []}
    ),
    "POST /projects/{project_id}/perspectives/aspects/{aspect_id}/accept-labels": (
        lambda rows: {"sdoc_ids": [rows["sdoc"].id], "filter": _NO_FILTER, "sorts": []}
    ),
    "POST /projects/{project_id}/perspectives/aspects/{aspect_id}/revert-labels": (
        lambda rows: {"sdoc_ids": [rows["sdoc"].id], "filter": _NO_FILTER, "sorts": []}
    ),
    "PATCH /projects/{project_id}/source-document-metadata/{sdoc_metadata_id}": (
        lambda rows: {
            "str_value": "changed",
            "int_value": None,
            "boolean_value": None,
            "date_value": None,
            "list_value": None,
        }
    ),
}

# the required query parameters of the routes with a path id, by "<METHOD> <path>"
QUERIES: dict[str, dict[str, str]] = {
    "POST /projects/{project_id}/experiments/runs/{run_id}/export-log": {
        "export_format": "json"
    },
    "GET /projects/{project_id}/perspectives/aspects/{aspect_id}/clusters": {
        "sdoc_id": "0"
    },
    "POST /projects/{project_id}/perspectives/aspects/{aspect_id}/visualize": {
        "search_query": ""
    },
    "POST /projects/{project_id}/perspectives/aspects/{aspect_id}/accept-labels": {
        "search_query": ""
    },
    "POST /projects/{project_id}/perspectives/aspects/{aspect_id}/revert-labels": {
        "search_query": ""
    },
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


# the annotation route groups with a bulk create (PUT /bulk)
BULK_CREATE_GROUPS = {"span-annotations", "sentence-annotations"}


def _project_routes(client: TestClient) -> list[tuple[str, APIRoute]]:
    """The routes of the app the client runs. `include_router` keeps the routers
    as they are, so the routes are found through their route contexts."""
    return [
        (method, context.original_route)
        for context in iter_route_contexts(client.app.routes)  # type: ignore[attr-defined]
        if isinstance(context.original_route, APIRoute)
        and context.original_route.path.startswith(PROJECT_PREFIX)
        for method in sorted(context.original_route.methods or ())
    ]


def _path_params(route: APIRoute) -> list[str]:
    return [name for name in re.findall(r"{(\w+)}", route.path) if name != "project_id"]


def _path_id(
    name: str, route: APIRoute, rows: TenantRows, jobs: dict[str, str]
) -> int | str:
    """The id of the tenant's row (or job) that the path parameter names."""
    if name == JOB_ID:
        match = re.search(r"/jobs/([\w-]+)/", route.path)
        assert match, f"{route.path}: {JOB_ID} outside /jobs/<job type>"
        return jobs[match.group(1).replace("-", "_")]
    return PATH_IDS[name](rows)


# ===========================================================================
# ALL PROJECT ROUTES: PATH IDS
# ===========================================================================


def test_every_project_route_is_covered(client: TestClient) -> None:
    """Every path id of a project route is in PATH_IDS, and every route with a path
    id and a body or a required query parameter has them in BODIES and QUERIES, so
    a new route is covered by the tests below."""
    routes = _project_routes(client)
    assert routes, "no route under /projects/{project_id}"
    for method, route in routes:
        for name in _path_params(route):
            assert name in PATH_IDS or name == JOB_ID, (
                f"{method} {route.path}: add {name} to PATH_IDS"
            )
        if _path_params(route) and route.body_field is not None:
            assert f"{method} {route.path}" in BODIES, (
                f"{method} {route.path}: add a body to BODIES"
            )
        required_queries = [
            param.name
            for param in route.dependant.query_params
            if param.field_info.is_required()
        ]
        if _path_params(route) and required_queries:
            assert set(required_queries) <= set(
                QUERIES.get(f"{method} {route.path}", {})
            ), f"{method} {route.path}: add {required_queries} to QUERIES"


def test_path_id_of_another_project_is_not_found(
    client: TestClient, tenants: TwoTenants, tenant_jobs: TenantJobs
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
                name: _path_id(
                    name,
                    route,
                    foreign if name == foreign_name else own,
                    tenant_jobs["foreign" if name == foreign_name else "own"],
                )
                for name in names
            }
            url = route.path.format(project_id=own["project"].id, **values)
            response = client.request(
                method,
                url,
                params=QUERIES.get(f"{method} {route.path}"),
                json=body(own) if body is not None else None,
            )
            if response.status_code != 404:
                failures.append(
                    f"{method} {url} ({foreign_name} foreign): "
                    f"{response.status_code} {response.text[:200]}"
                )
    assert not failures, "\n".join(failures)


def test_every_project_route_rejects_a_non_member(
    non_member_client: TestClient, test_project: ProjectORM
) -> None:
    """Every project route answers 403 to a user who is not a member of the
    project of the path, before it reads its path ids or its body."""
    failures: list[str] = []
    for method, route in _project_routes(non_member_client):
        url = re.sub(
            r"{(\w+)}", "0", route.path.replace("{project_id}", str(test_project.id))
        )
        response = non_member_client.request(method, url)
        if response.status_code != 403:
            failures.append(
                f"{method} {url}: {response.status_code} {response.text[:200]}"
            )
    assert not failures, "\n".join(failures)


# ===========================================================================
# ANNOTATION ROUTES: BODY AND QUERY IDS
# ===========================================================================


@pytest.mark.parametrize("group", list(ANNOTATION_GROUPS))
@pytest.mark.parametrize("foreign_field", ["code_id", "sdoc_id"])
def test_create_with_a_body_id_of_another_project_is_a_conflict(
    client: TestClient, tenants: TwoTenants, group: str, foreign_field: str
) -> None:
    """Creating an annotation (single and, where it exists, bulk) with the code or
    the document of the other project is rejected by the composite foreign key
    (409)."""
    own, foreign = tenants["own"], tenants["foreign"]
    body = {
        **ANNOTATION_GROUPS[group][2],
        "code_id": (foreign if foreign_field == "code_id" else own)["code"].id,
        "sdoc_id": (foreign if foreign_field == "sdoc_id" else own)["sdoc"].id,
    }
    url = f"/projects/{own['project'].id}/{group}"

    response = client.put(url, json=body)
    assert response.status_code == 409, response.text

    if group in BULK_CREATE_GROUPS:
        response = client.put(f"{url}/bulk", json=[body])
        assert response.status_code == 409, response.text


@pytest.mark.parametrize("group", list(ANNOTATION_GROUPS))
def test_update_with_a_code_of_another_project_is_a_conflict(
    client: TestClient, tenants: TwoTenants, group: str
) -> None:
    """Changing the code of an own annotation (single and bulk) to the code of the
    other project is rejected by the composite foreign key (409)."""
    own, foreign = tenants["own"], tenants["foreign"]
    row, id_field, _ = ANNOTATION_GROUPS[group]
    url = f"/projects/{own['project'].id}/{group}"

    response = client.patch(
        f"{url}/{own[row].id}", json={"code_id": foreign["code"].id}
    )
    assert response.status_code == 409, response.text

    response = client.patch(
        f"{url}/bulk", json=[{id_field: own[row].id, "code_id": foreign["code"].id}]
    )
    assert response.status_code == 409, response.text


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


def test_document_filter_id_of_another_project_matches_nothing(
    client: TestClient, tenants: TwoTenants
) -> None:
    """Filtering the document metadata of the path's project by a document of the
    other project returns nothing, while the own document returns its metadata."""
    own, foreign = tenants["own"], tenants["foreign"]
    url = f"/projects/{own['project'].id}/source-document-metadata"

    response = client.get(url, params={"sdoc_id": own["sdoc"].id})
    assert response.status_code == 200, response.text
    assert [meta["id"] for meta in response.json()] == [own["sdoc_metadata"].id]

    response = client.get(url, params={"sdoc_id": foreign["sdoc"].id})
    assert response.status_code == 200, response.text
    assert response.json() == []


def test_memo_filter_by_an_object_of_another_project_matches_nothing(
    client: TestClient, tenants: TwoTenants
) -> None:
    """Filtering the memos of the path's project by the code of the other project
    returns nothing, while the own code returns its memos."""
    own, foreign = tenants["own"], tenants["foreign"]
    url = f"/projects/{own['project'].id}/memos"

    response = client.get(
        url,
        params={"attached_object_type": "code", "attached_object_id": own["code"].id},
    )
    assert response.status_code == 200, response.text
    assert {memo["id"] for memo in response.json()} == {
        own["memo"].id,
        own["bare_memo"].id,
    }

    response = client.get(
        url,
        params={
            "attached_object_type": "code",
            "attached_object_id": foreign["code"].id,
        },
    )
    assert response.status_code == 200, response.text
    assert response.json() == []


def test_memo_on_an_object_of_another_project_is_a_conflict(
    client: TestClient, tenants: TwoTenants
) -> None:
    """Creating a memo on the code of the other project is rejected by the
    composite foreign key of its object handle (409)."""
    own, foreign = tenants["own"], tenants["foreign"]

    response = client.put(
        f"/projects/{own['project'].id}/memos",
        json={
            "title": "Cross-project memo",
            "content": "",
            "content_json": "",
            "attached_object_type": "code",
            "attached_object_id": foreign["code"].id,
        },
    )
    assert response.status_code == 409, response.text
