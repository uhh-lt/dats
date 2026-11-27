from fastapi import FastAPI

from systems.mcp_system.mcp_server import EXCLUDED_ROUTES

# ===========================================================================
# MCP TOOLS (systems/mcp_system/mcp_server.py) TESTS
# ===========================================================================
# The MCP server offers every route whose router has the tag `mcp` as a tool,
# except EXCLUDED_ROUTES; the tool is named after the operation id
# `<tag>-<handler>`, with `_` for `-` (`spanAnnotations_create`). A changed tool
# list changes what agents can do, so it changes here on purpose only.

# the first tags of the routers whose routes are MCP tools
MCP_TOOL_TAGS = {
    "bboxAnnotations",
    "codes",
    "features",
    "folders",
    "members",
    "memos",
    "projectMetadata",
    "projects",
    "search",
    "sentenceAnnotations",
    "sourceDocumentMetadata",
    "sourceDocuments",
    "spanAnnotations",
    "tags",
    "users",
    "virtualUsers",
}


def _tools(app: FastAPI) -> dict[tuple[str, str], str]:
    """The MCP tools by (method, path): the operation ids of the `mcp` routes
    without the excluded ones."""
    return {
        (method.upper(), path): operation["operationId"]
        for path, operations in app.openapi()["paths"].items()
        for method, operation in operations.items()
        if "mcp" in operation["tags"] and (method.upper(), path) not in EXCLUDED_ROUTES
    }


def test_the_mcp_tools_are_the_routes_of_the_mcp_routers(app: FastAPI) -> None:
    """The tools come from the routers of MCP_TOOL_TAGS, 112 in all, each named
    by its operation id."""
    tools = _tools(app)

    assert {operation_id.split("-")[0] for operation_id in tools.values()} == (
        MCP_TOOL_TAGS
    )
    assert len(tools) == 112
    assert tools[("PUT", "/projects/{project_id}/span-annotations")] == (
        "spanAnnotations-create"
    )


def test_deleting_the_own_account_is_no_mcp_tool(app: FastAPI) -> None:
    """An agent must not delete the account: DELETE /users/me is the only
    excluded route, and it is a route of an `mcp` router."""
    operations = app.openapi()["paths"]["/users/me"]

    assert EXCLUDED_ROUTES == {("DELETE", "/users/me")}
    assert "mcp" in operations["delete"]["tags"]
    assert ("DELETE", "/users/me") not in _tools(app)
