from collections.abc import Awaitable, Callable, Sequence
from typing import Any

import httpx2
from fastapi import FastAPI
from fastmcp import FastMCP
from fastmcp.server.dependencies import get_http_request
from fastmcp.server.providers.openapi import (
    MCPType,
    OpenAPIResource,
    OpenAPIResourceTemplate,
    OpenAPITool,
)
from fastmcp.utilities.lifespan import combine_lifespans
from fastmcp.utilities.openapi import HTTPRoute
from mcp_types import ToolAnnotations

# Routes with this tag are MCP tools: MCP clients and the agents can call them.
MCP_TAG = "mcp"
# OpenAPI extension for update (PATCH) routes that remove or share data, so MCP
# clients and the agents ask the user before calling them:
# `@router.patch(..., openapi_extra={MCP_DESTRUCTIVE_EXTENSION: True})`
MCP_DESTRUCTIVE_EXTENSION = "x-mcp-destructive"

AuthHook = Callable[[httpx2.Request], Awaitable[None]]


def create_route_mapper(
    tags: Sequence[str] | None = None,
) -> Callable[[HTTPRoute, MCPType], MCPType | None]:
    """Maps the routes with the MCP tag to tools. With `tags`, only the routes
    that also have one of these tags."""
    tag_set = set(tags or [])

    def route_mapper(route: HTTPRoute, mcp_type: MCPType) -> MCPType | None:
        if MCP_TAG not in route.tags:
            return MCPType.EXCLUDE
        if tag_set and not tag_set.intersection(route.tags):
            return MCPType.EXCLUDE
        return MCPType.TOOL

    return route_mapper


def annotate_tool(
    route: HTTPRoute,
    component: OpenAPITool | OpenAPIResource | OpenAPIResourceTemplate,
) -> None:
    """Sets the MCP tool annotations from the HTTP method (see the endpoint
    instructions): GET reads and POST computes, PUT creates, PATCH updates and
    DELETE removes. Removing (DELETE or PATCH routes marked with
    MCP_DESTRUCTIVE_EXTENSION) is destructive."""
    if not isinstance(component, OpenAPITool):
        return
    match route.method:
        case "GET" | "POST":
            component.annotations = ToolAnnotations(read_only_hint=True)
        case "DELETE":
            component.annotations = ToolAnnotations(
                read_only_hint=False, destructive_hint=True
            )
        case _:
            destructive = route.extensions.get(MCP_DESTRUCTIVE_EXTENSION) is True
            component.annotations = ToolAnnotations(
                read_only_hint=False, destructive_hint=destructive
            )


def requires_approval(annotations: dict[str, Any] | None) -> bool:
    """Whether a tool with these MCP annotations (camelCase keys, as sent to MCP
    clients) needs the user's approval: destructive tools do. Like the MCP spec,
    a tool without annotations counts as destructive."""
    annotations = annotations or {}
    if annotations.get("readOnlyHint", False):
        return False
    return annotations.get("destructiveHint", True)


def create_mcp_server(
    *,
    app: FastAPI,
    name: str,
    auth_hook: AuthHook,
    tags: Sequence[str] | None = None,
    instructions: str | None = None,
) -> FastMCP:
    """An MCP server whose tools are the app's routes with the MCP tag (and one of
    `tags`, if given). `auth_hook` adds the caller's credentials to each request."""
    return FastMCP.from_fastapi(
        app=app,
        name=name,
        instructions=instructions,
        route_map_fn=create_route_mapper(tags),
        mcp_component_fn=annotate_tool,
        httpx_client_kwargs={"event_hooks": {"request": [auth_hook]}},
    )


async def _forward_auth_header(request: httpx2.Request) -> None:
    """Forward authorization header from inbound MCP request to the ASGI app."""
    try:
        mcp_request = get_http_request()
        auth = mcp_request.headers.get("authorization")
        if auth:
            request.headers["authorization"] = auth
    except RuntimeError:
        pass


def mcp_run(app: FastAPI, lifespan: Callable) -> None:
    mcp = create_mcp_server(
        app=app,
        name="DATS MCP",
        instructions="Provides tools for managing and annotating data in DATS.",
        auth_hook=_forward_auth_header,
    )
    mcp_app = mcp.http_app()
    app.router.lifespan_context = combine_lifespans(lifespan, mcp_app.lifespan)
    app.mount("/", mcp_app)
