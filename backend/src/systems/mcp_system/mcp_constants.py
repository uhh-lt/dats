# Routes with this tag are MCP tools: MCP clients and the agents can call them.
MCP_TAG = "mcp"

# OpenAPI extension for update (PATCH) routes that remove, overwrite in bulk or
# share data, so MCP clients and the agents ask the user before calling them:
# `@router.patch(..., openapi_extra={MCP_DESTRUCTIVE_EXTENSION: True})`
MCP_DESTRUCTIVE_EXTENSION = "x-mcp-destructive"
