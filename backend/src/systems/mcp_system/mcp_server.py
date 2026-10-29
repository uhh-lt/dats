from typing import Callable, Sequence

from fastapi import FastAPI
from fastmcp import FastMCP
from fastmcp.server.dependencies import get_http_request
from fastmcp.server.providers.openapi import MCPType
from fastmcp.utilities.lifespan import combine_lifespans
from fastmcp.utilities.openapi import HTTPRoute


def create_route_mapper(
    target_tags: Sequence[str],
) -> Callable[[HTTPRoute, MCPType], MCPType | None]:
    """Route map factory"""
    tag_set = set(target_tags)

    def route_mapper(route: HTTPRoute, mcp_type: MCPType) -> MCPType | None:
        if any(tag in tag_set for tag in route.tags):
            return MCPType.TOOL
        return MCPType.EXCLUDE

    return route_mapper


async def _forward_auth_header(request):
    """Forward authorization header from inbound MCP request to the ASGI app."""
    try:
        mcp_request = get_http_request()
        auth = mcp_request.headers.get("authorization")
        if auth:
            request.headers["authorization"] = auth
    except RuntimeError:
        pass


def mcp_run(app: FastAPI, lifespan: Callable) -> None:
    mcp = FastMCP.from_fastapi(
        app=app,
        name="DATS MCP",
        instructions="Provides tools for managing and annotating data in DATS.",
        route_map_fn=create_route_mapper(["mcp"]),
        httpx_client_kwargs={"event_hooks": {"request": [_forward_auth_header]}},
    )
    mcp_app = mcp.http_app()
    app.router.lifespan_context = combine_lifespans(lifespan, mcp_app.lifespan)
    app.mount("/", mcp_app)
