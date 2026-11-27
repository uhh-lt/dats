from fastapi import FastAPI

from systems.mcp_system.mcp_server import EXCLUDED_ROUTES

# ===========================================================================
# MCP TOOLS (systems/mcp_system/mcp_server.py) TESTS
# ===========================================================================
# The MCP server offers every route whose router has the tag `mcp` as a tool,
# except EXCLUDED_ROUTES; the tool is named after the operation id
# `<tag>-<handler>`, with `_` for `-` (`spanAnnotations_create`).


def _tools(app: FastAPI) -> dict[tuple[str, str], str]:
    """The MCP tools by (method, path): the operation ids of the `mcp` routes
    without the excluded ones."""
    return {
        (method.upper(), path): operation["operationId"]
        for path, operations in app.openapi()["paths"].items()
        for method, operation in operations.items()
        if "mcp" in operation["tags"] and (method.upper(), path) not in EXCLUDED_ROUTES
    }


def test_deleting_the_own_account_is_no_mcp_tool(app: FastAPI) -> None:
    """An agent must not delete the account: DELETE /users/me is the only
    excluded route, and it is a route of an `mcp` router."""
    operations = app.openapi()["paths"]["/users/me"]

    assert EXCLUDED_ROUTES == {("DELETE", "/users/me")}
    assert "mcp" in operations["delete"]["tags"]
    assert ("DELETE", "/users/me") not in _tools(app)
