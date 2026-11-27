"""Every route under /projects/{project_id} keeps to the project of the path, also
for a user who is a member of both projects: a path id of another project answers
404, a body id of another project in a write is rejected by the composite foreign
key (409), and a filter id of another project matches nothing."""

import ast
import re
from pathlib import Path
from typing import Any, Callable

import pytest
from fastapi import FastAPI
from fastapi.routing import APIRoute, RouteContext, iter_route_contexts
from fastapi.testclient import TestClient
from starlette.routing import Mount, Route, WebSocketRoute

from composite_keys_test_utils import TenantRows, TwoTenants
from core.project.project_orm import ProjectORM

from .conftest import PathTenant

PROJECT_PREFIX = "/projects/{project_id}"

# the path parameter of a job, a job of the type the route names after /jobs/
JOB_ID = "job_id"

# the route whose user_id names a member of the project, not a virtual user
MEMBER_PATH = f"{PROJECT_PREFIX}/members/{{user_id}}"

# every route outside /projects/{project_id} (see `_route_key`); none of them
# reads or writes the data of one project without checking the membership
ROUTES_OUTSIDE_PROJECTS = {
    # the API documentation
    "GET /docs",
    "HEAD /docs",
    "GET /docs/oauth2-redirect",
    "HEAD /docs/oauth2-redirect",
    "GET /openapi.json",
    "HEAD /openapi.json",
    "GET /redoc",
    "HEAD /redoc",
    # authentication; /content checks the membership for the file of a project
    "GET /authentication/content",
    "POST /authentication/login",
    "POST /authentication/logout",
    "GET /authentication/oidc/callback",
    "GET /authentication/oidc/login",
    "POST /authentication/refresh-access",
    "PUT /authentication/register",
    "POST /authentication/sync-session",
    # the logged-in user
    "GET /users/me",
    "PATCH /users/me",
    "DELETE /users/me",
    "GET /users/me/api-keys",
    "PUT /users/me/api-keys",
    "DELETE /users/me/api-keys/{api_key_id}",
    "GET /users/me/projects",
    # a new project
    "PUT /projects",
    # the server
    "GET /",
    "GET /heartbeat",
    "GET /info",
    "GET /info/llms",
    "GET /info/features",
    # the websocket and the MCP server (which forwards to the API routes)
    "WEBSOCKET /ws",
    "MOUNT /",
}

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
    "prompt_id": lambda rows: rows["prompt"].id,
    "search_view_id": lambda rows: rows["search_view"].id,
    # a virtual user belongs to its project; it is no member of any project
    "virtual_user_id": lambda rows: rows["virtual_user"].id,
}

# path parameters that name no row of a project (a feature is named by its name)
NON_ID_PARAMS = {"feature"}

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
    "PATCH /projects/{project_id}/concept-over-time-analyses/{cota_id}/annotate-sentences": (
        lambda rows: {"cota_sentence_ids": []}
    ),
    "PATCH /projects/{project_id}/concept-over-time-analyses/{cota_id}/remove-sentences": (
        lambda rows: {"cota_sentence_ids": []}
    ),
    "POST /projects/{project_id}/concept-over-time-analyses/{cota_id}/refine": (
        lambda rows: {}
    ),
    "POST /projects/{project_id}/experiments/{experiment_id}/runs/{run_id}/export-log": (
        lambda rows: {"export_format": "json"}
    ),
    "PATCH /projects/{project_id}/experiments/{experiment_id}": (
        lambda rows: {"name": "renamed"}
    ),
    "PUT /projects/{project_id}/experiments/{experiment_id}/runs": lambda rows: {
        "name": "second run",
        "prompt_version_id": rows["prompt_version"].id,
        "model": "model",
    },
    "PATCH /projects/{project_id}/classifiers/{classifier_id}": (
        lambda rows: {"name": "renamed"}
    ),
    "PATCH /projects/{project_id}/perspectives/aspects/{aspect_id}": (
        lambda rows: {"name": "renamed"}
    ),
    "PATCH /projects/{project_id}/perspectives/aspects/{aspect_id}/clusters/{cluster_id}": (
        lambda rows: {"name": "renamed"}
    ),
    "POST /projects/{project_id}/perspectives/aspects/{aspect_id}/visualization": (
        lambda rows: {"search_query": "", "filter": _NO_FILTER}
    ),
    "PATCH /projects/{project_id}/perspectives/aspects/{aspect_id}/accept-labels": (
        lambda rows: {
            "sdoc_ids": [rows["sdoc"].id],
            "search_query": "",
            "filter": _NO_FILTER,
        }
    ),
    "PATCH /projects/{project_id}/perspectives/aspects/{aspect_id}/revert-labels": (
        lambda rows: {
            "sdoc_ids": [rows["sdoc"].id],
            "search_query": "",
            "filter": _NO_FILTER,
        }
    ),
    "PUT /projects/{project_id}/prompts/{prompt_id}/versions": lambda rows: {
        "text": "<document:whole> <codes> <output-format:inline>",
        "codes": [{"code_id": rows["code"].id, "name": "Code", "description": ""}],
    },
    "PATCH /projects/{project_id}/prompts/{prompt_id}": (
        lambda rows: {"name": "renamed"}
    ),
    "PATCH /projects/{project_id}/search-views/{search_view_id}": (
        lambda rows: {"name": "renamed"}
    ),
    "PATCH /projects/{project_id}/virtual-users/{virtual_user_id}": (
        lambda rows: {"first_name": "renamed"}
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

# the required query parameters of the routes with a path id on the rows of a
# tenant, by "<METHOD> <path>"
QUERIES: dict[str, Callable[[TenantRows], dict[str, Any]]] = {
    "GET /projects/{project_id}/perspectives/aspects/{aspect_id}/clusters": (
        lambda rows: {"sdoc_id": rows["sdoc"].id}
    ),
}

# the routes that answer no 2xx with the path ids of the own tenant, by
# "<METHOD> <path>": their status and why the fixture cannot give them a 2xx
OWN_ID_EXCEPTIONS: dict[str, tuple[int, str]] = {
    "PUT /projects/{project_id}/experiments/{experiment_id}/runs": (
        409,
        "the experiment has no gold annotator",
    ),
    "PATCH /projects/{project_id}/experiments/{experiment_id}/refresh-scores": (
        409,
        "the experiment has no gold annotator",
    ),
    "PATCH /projects/{project_id}/experiments/{experiment_id}/runs/{run_id}/refresh-scores": (
        409,
        "the experiment of the run has no gold annotator",
    ),
    "DELETE /projects/{project_id}/experiments/{experiment_id}": (
        409,
        "the virtual user of its run is the test user, who is still in use",
    ),
    "DELETE /projects/{project_id}/experiments/{experiment_id}/runs/{run_id}": (
        409,
        "the virtual user of the run is the test user, who is still in use",
    ),
    "PUT /projects/{project_id}/span-groups/{span_group_id}/span-annotations/{span_annotation_id}": (
        409,
        "the span annotation is in the span group already",
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


# the annotation route groups with a bulk create (PUT /bulk)
BULK_CREATE_GROUPS = {"span-annotations", "sentence-annotations"}


def _project_routes(client: TestClient) -> list[tuple[str, str, APIRoute]]:
    """Method, full path and route of every route under /projects/{project_id} of
    the app the client runs. `include_router` keeps the routers as they are, so
    the routes are found through their route contexts, whose path includes the
    include prefixes."""
    return [
        (method, path, context.original_route)
        for context in iter_route_contexts(client.app.routes)  # type: ignore[attr-defined]
        if isinstance(context.original_route, APIRoute)
        and (path := context.path) is not None
        and path.startswith(PROJECT_PREFIX)
        for method in sorted(context.original_route.methods or ())
    ]


def _route_key(context: RouteContext) -> list[str]:
    """ "<METHOD> <full path>" per method of the route, "WEBSOCKET <path>" for a
    websocket and "MOUNT <path>" for a mounted app."""
    # the route of an included router with the include prefixes in its path
    route = getattr(context, "starlette_route", None) or context.route
    if isinstance(route, Mount):
        return [f"MOUNT {route.path or '/'}"]
    if isinstance(route, WebSocketRoute):
        return [f"WEBSOCKET {route.path}"]
    assert isinstance(route, Route), f"unknown kind of route {route}"
    return [f"{method} {route.path}" for method in sorted(route.methods or ())]


def _path_params(path: str) -> list[str]:
    return [
        name
        for name in re.findall(r"{(\w+)}", path)
        if name != "project_id" and name not in NON_ID_PARAMS
    ]


def _path_id(name: str, path: str, tenant: PathTenant) -> int | str:
    """The id of the tenant's row, job or member that the path parameter names."""
    if name == JOB_ID:
        match = re.search(r"/jobs/([\w-]+)/", path)
        assert match, f"{path}: {JOB_ID} outside /jobs/<job type>"
        return tenant["jobs"][match.group(1).replace("-", "_")]
    if path == MEMBER_PATH:
        return tenant["member"].id
    return PATH_IDS[name](tenant["rows"])


def _request_with_path_ids(
    client: TestClient,
    method: str,
    path: str,
    tenant_by_param: dict[str, PathTenant],
    own: PathTenant,
) -> tuple[str, Any]:
    """Send the request of the route in the project of `own`, with the path ids
    of the given tenant per parameter and the body and query of `own`."""
    values = {
        name: _path_id(name, path, tenant) for name, tenant in tenant_by_param.items()
    }
    url = path.format(project_id=own["rows"]["project"].id, **values)
    body = BODIES.get(f"{method} {path}")
    query = QUERIES.get(f"{method} {path}")
    response = client.request(
        method,
        url,
        params=query(own["rows"]) if query is not None else None,
        json=body(own["rows"]) if body is not None else None,
    )
    return url, response


# ===========================================================================
# ALL PROJECT ROUTES: PATH IDS
# ===========================================================================


def test_only_the_known_routes_are_outside_projects(client: TestClient) -> None:
    """Every route outside /projects/{project_id} is in ROUTES_OUTSIDE_PROJECTS, so
    a new route that serves project data under another prefix fails here instead
    of escaping the project tests."""
    routes = {
        key
        for context in iter_route_contexts(client.app.routes)  # type: ignore[attr-defined]
        for key in _route_key(context)
        if not key.split(" ")[1].startswith(PROJECT_PREFIX)
    }
    assert routes == ROUTES_OUTSIDE_PROJECTS


def test_every_project_route_is_covered(client: TestClient) -> None:
    """Every path id of a project route is in PATH_IDS, and every route with a path
    id and a body or a required query parameter has them in BODIES and QUERIES, so
    a new route is covered by the tests below."""
    routes = _project_routes(client)
    assert routes, "no route under /projects/{project_id}"
    for method, path, route in routes:
        for name in _path_params(path):
            assert name in PATH_IDS or name == JOB_ID or path == MEMBER_PATH, (
                f"{method} {path}: add {name} to PATH_IDS"
            )
        if _path_params(path) and route.body_field is not None:
            assert f"{method} {path}" in BODIES, (
                f"{method} {path}: add a body to BODIES"
            )
        required_queries = [
            param.name
            for param in route.dependant.query_params
            if param.field_info.is_required()
        ]
        if _path_params(path) and required_queries:
            assert f"{method} {path}" in QUERIES, (
                f"{method} {path}: add {required_queries} to QUERIES"
            )


def test_path_id_of_another_project_is_not_found(
    client: TestClient,
    path_tenants: dict[str, PathTenant],
    new_own_path_tenant: Callable[[], PathTenant],
) -> None:
    """Every project route answers 404 when one of its path ids belongs to the other
    project and the others to the path's project, and 2xx (the status of
    OWN_ID_EXCEPTIONS for the routes listed there) when all belong to the path's
    project (so the 404 comes from the foreign id); the user is a member of both.
    The request with own ids comes last, and a DELETE route gets its own new
    project, so no request deletes what a later one names."""
    foreign = path_tenants["foreign"]
    failures: list[str] = []
    routes = _project_routes(client)
    assert routes, "no route under /projects/{project_id}"
    for method, path, _ in routes:
        names = _path_params(path)
        if not names:
            continue
        own = new_own_path_tenant() if method == "DELETE" else path_tenants["own"]
        for foreign_name in names:
            url, response = _request_with_path_ids(
                client,
                method,
                path,
                {name: foreign if name == foreign_name else own for name in names},
                own,
            )
            if response.status_code != 404:
                failures.append(
                    f"{method} {url} ({foreign_name} foreign): "
                    f"{response.status_code} {response.text[:200]}"
                )
        url, response = _request_with_path_ids(
            client, method, path, {name: own for name in names}, own
        )
        exception = OWN_ID_EXCEPTIONS.get(f"{method} {path}")
        if not (
            response.status_code == exception[0] if exception else response.is_success
        ):
            failures.append(
                f"{method} {url} (all own): {response.status_code} "
                f"{response.text[:200]}"
            )
    assert not failures, "\n".join(failures)


def test_every_project_route_rejects_a_non_member(
    non_member_client: TestClient, test_project: ProjectORM
) -> None:
    """Every project route answers 403 to a user who is not a member of the
    project of the path, before it reads its path ids or its body."""
    failures: list[str] = []
    for method, path, _ in _project_routes(non_member_client):
        url = re.sub(
            r"{(\w+)}", "0", path.replace("{project_id}", str(test_project.id))
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


def test_search_filter_by_a_code_of_another_project_matches_nothing(
    client: TestClient, tenants: TwoTenants
) -> None:
    """Searching the span annotations of the path's project for the code of the
    other project finds nothing, while the own code finds the own annotation."""
    own, foreign = tenants["own"], tenants["foreign"]
    url = f"/projects/{own['project'].id}/search/span-annotations"

    def search(code_id: int) -> list[int]:
        response = client.post(
            url,
            json={
                "filter": {
                    "id": "root",
                    "logic_operator": "and",
                    "items": [
                        {
                            "id": "code",
                            "column": "SP_CODE_ID_LIST_RECURSIVE",
                            "operator": "IDLR_CONTAINS",
                            "value": code_id,
                        }
                    ],
                },
            },
        )
        assert response.status_code == 200, response.text
        return [row["id"] for row in response.json()["items"]]

    assert search(own["code"].id) == [own["span"].id]
    assert search(foreign["code"].id) == []


# ===========================================================================
# ALL ROUTES: REQUEST SHAPES
# ===========================================================================
# The guide's "Everything else" under "Input": the input of a create, an update, an
# action or a computation is one body DTO (a bare list only on a bulk route), and
# query parameters belong to GET reads only.

# routes whose request shape is fixed from outside, by "<METHOD> <path>"
REQUEST_SHAPE_EXCEPTIONS = {
    # the OAuth2 password form
    "POST /authentication/login",
    # the tag recommendation routes wait for #976
    "PATCH /projects/{project_id}/tag-recommendations/review",
}


def test_every_route_takes_one_body_dto_and_query_parameters_only_on_reads(
    app: FastAPI,
) -> None:
    """No route besides a GET takes query parameters, no body is a set of loose
    fields (a generated `Body_*` schema, except a multipart upload form), and a
    bare list body is a bulk route."""
    schema = app.openapi()
    violations = []
    for path, operations in schema["paths"].items():
        for method, operation in operations.items():
            route = f"{method.upper()} {path}"
            if route in REQUEST_SHAPE_EXCEPTIONS:
                continue
            queries = [
                p["name"] for p in operation.get("parameters", []) if p["in"] == "query"
            ]
            if queries and method != "get":
                violations.append(f"{route}: query {queries}")
            body = operation.get("requestBody")
            if body is None:
                continue
            content_type, content = next(iter(body["content"].items()))
            body_schema = content["schema"]
            ref = body_schema.get("$ref", "").rsplit("/", 1)[-1]
            if ref.startswith("Body_") and content_type != "multipart/form-data":
                violations.append(f"{route}: loose body fields")
            if body_schema.get("type") == "array" and "/bulk" not in path:
                violations.append(f"{route}: bare list body")
    assert violations == []


# ===========================================================================
# ALL ROUTES: TAGS
# ===========================================================================
# The guide's "Tags": the first tag of a route is the first path segment after
# `/projects/{project_id}` in camelCase, and `projects` for the project itself.


def _first_segment_tag(path: str) -> str:
    """The tag the path gets: its first segment after the project in camelCase."""
    segments = [s for s in path.removeprefix("/projects/{project_id}").split("/") if s]
    if not segments:
        return "projects"
    first, *rest = segments[0].split("-")
    return first + "".join(word.capitalize() for word in rest)


def test_every_route_has_the_tag_of_its_first_path_segment(app: FastAPI) -> None:
    """The first tag names the generated client service and the MCP tools, so it
    follows the path: `/span-annotations` → `spanAnnotations`,
    `/perspectives/aspects` → `perspectives`, `/users/me` → `users`."""
    schema = app.openapi()
    violations = [
        f"{method.upper()} {path}: {operation['tags'][0]}"
        for path, operations in schema["paths"].items()
        for method, operation in operations.items()
        if operation["tags"][0] != _first_segment_tag(path)
    ]
    assert violations == []


# ===========================================================================
# ALL ROUTES: GUARDS OF THE ROUTER RULE AND THE INPUT RULE
# ===========================================================================
# One router per endpoint file, the router sets the tag, and a GET takes no body.

ENDPOINT_FILES = sorted(
    Path(__file__).parents[3].joinpath("src").rglob("*_endpoint.py")
)
ROUTE_DECORATORS = {"get", "put", "patch", "post", "delete", "api_route", "websocket"}
# the endpoint files with two routers, and why (the kept exceptions of the rules)
TWO_ROUTER_FILES = {
    # PUT /projects creates a project outside every project, without the
    # membership check of the project router
    "project_endpoint.py",
}


def _calls(path: Path) -> list[ast.Call]:
    return [
        node
        for node in ast.walk(ast.parse(path.read_text()))
        if isinstance(node, ast.Call)
    ]


def test_no_route_sets_a_tag() -> None:
    """The router sets the tag; a route decorator with `tags=` would add a tag
    after the router's (an `mcp` tag would make the route an MCP tool)."""
    tagged = [
        f"{path.name}:{call.lineno}"
        for path in ENDPOINT_FILES
        for call in _calls(path)
        if isinstance(call.func, ast.Attribute)
        and call.func.attr in ROUTE_DECORATORS
        and any(keyword.arg == "tags" for keyword in call.keywords)
    ]
    assert tagged == []


def test_every_endpoint_file_has_one_router() -> None:
    """One router per endpoint file, except the kept exceptions."""
    counts = {
        path.name: sum(
            isinstance(call.func, ast.Name)
            and call.func.id in ("APIRouter", "project_router")
            for call in _calls(path)
        )
        for path in ENDPOINT_FILES
    }
    assert {name: count for name, count in counts.items() if count != 1} == {
        name: 2 for name in TWO_ROUTER_FILES
    }


def test_no_get_route_takes_a_body(app: FastAPI) -> None:
    """A read whose input needs a body is a POST; a GET takes query parameters
    only."""
    schema = app.openapi()
    assert [
        path
        for path, operations in schema["paths"].items()
        if "requestBody" in operations.get("get", {})
    ] == []
