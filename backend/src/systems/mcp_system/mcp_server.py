from typing import Callable

from fastapi import FastAPI
from fastmcp import FastMCP
from fastmcp.server.dependencies import get_http_request
from fastmcp.server.providers.openapi import MCPType
from fastmcp.utilities.lifespan import combine_lifespans
from fastmcp.utilities.openapi import HTTPRoute


def _custom_route_mapper(route: HTTPRoute, mcp_type: MCPType) -> MCPType | None:
    if "mcp" in route.tags:
        return MCPType.TOOL
    else:
        return MCPType.EXCLUDE


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
        route_map_fn=_custom_route_mapper,
        httpx_client_kwargs={"event_hooks": {"request": [_forward_auth_header]}},
    )
    mcp_app = mcp.http_app()
    app.router.lifespan_context = combine_lifespans(lifespan, mcp_app.lifespan)
    app.mount("/", mcp_app)
