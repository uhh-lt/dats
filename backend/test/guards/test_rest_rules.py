"""The REST rules that hold for every route: the input shape, the tag, the router
per endpoint file and no body on a GET. A failure names the routes or files that
break a rule of `rest-endpoint-rules.md`."""

import ast
from pathlib import Path

from fastapi import FastAPI

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
    Path(__file__).parents[2].joinpath("src").rglob("*_endpoint.py")
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
