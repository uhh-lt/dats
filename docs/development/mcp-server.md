# MCP Server & API Keys

DATS exposes an [MCP](https://modelcontextprotocol.io) server so that AI assistants and other MCP clients can manage, search, and annotate data in DATS through tool calls. MCP clients authenticate with personal **API keys**, which can also be used as Bearer tokens against the regular REST API.

## MCP server

The backend runs an MCP server (built with [FastMCP](https://gofastmcp.com/)) alongside the REST API. It is mounted on the same FastAPI application and starts automatically with `just dev backend`:

```
http://localhost:<port_prefix>20/mcp
```

Only API endpoints tagged `mcp` are exposed as MCP tools — currently projects, codes, tags, memos, folders, source documents (including metadata), project metadata, span/sentence/bbox annotations, users, and search. To expose additional endpoints as tools, add the `mcp` tag to their router.

The implementation lives in `backend/src/mcp_server.py`; the MCP server forwards the client's `Authorization` header to the REST API, so every tool call runs with the permissions of the API key's owner.

## API keys

API keys are managed through the REST API (authentication required):

| Action        | Endpoint                          | Notes                                                                                              |
| ------------- | --------------------------------- | -------------------------------------------------------------------------------------------------- |
| Create a key  | `POST /api-keys/create`           | Pass a `name` and optionally `expires_in`. The raw key (`dats_...`) is returned **only once** — store it immediately. |
| List keys     | `GET /api-keys/list`              | Shows your active keys (prefix and expiry, never the raw key).                                     |
| Revoke a key  | `DELETE /api-keys/delete/{key_id}` |                                                                                                    |
| Client config | `GET /api-keys/mcp-config`        | Returns a ready-made MCP client configuration (see below).                                         |

Available `expires_in` values: `1_month`, `3_months`, `6_months`, `1_year` (default), `3_years`, `never`. Expired keys are rejected with `401`.

Use the key as a Bearer token, e.g.:

```bash
curl -H "Authorization: Bearer dats_..." http://localhost:<port_prefix>20/api-keys/list
```

## Connecting an MCP client

`GET /api-keys/mcp-config` returns a template configuration for MCP clients (replace `******` with `Bearer <your-api-key>`). For example, for Claude Desktop (via [`mcp-remote`](https://www.npmjs.com/package/mcp-remote)):

```json
{
  "mcpServers": {
    "dats-mcp-server": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:<port_prefix>20/mcp",
        "--header",
        "Authorization: Bearer dats_..."
      ]
    }
  }
}
```
