# MCP Server & API Keys

DATS exposes a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that allows AI assistants and external tools to interact with your projects programmatically. Users authenticate to the MCP server (and the REST API) via personal API keys.

## Architecture

The MCP server is built with [FastMCP](https://github.com/jlowin/fastmcp) and mounted directly onto the FastAPI application in `backend/src/main.py`. It re-uses the existing FastAPI routes — any endpoint tagged with `"mcp"` is automatically exposed as an MCP tool.

```
Client (Claude, Copilot, ...) ──MCP──► FastMCP ──► FastAPI routes ──► DATS backend
```

Key files:

- `backend/src/mcp_server.py` — MCP server setup, route mapping, and auth forwarding
- `backend/src/core/auth/api_key_endpoint.py` — API key CRUD endpoints
- `backend/src/core/auth/api_key_orm.py` — API key database model
- `backend/src/core/auth/security.py` — Key generation and hashing

## Enabling MCP for an Endpoint

Add `"mcp"` to the endpoint's `tags` list in its `APIRouter`:

```python
router = APIRouter(
    prefix="/code",
    dependencies=[Depends(get_current_user)],
    tags=["code", "mcp"],  # ← "mcp" tag exposes this router's endpoints as MCP tools
)
```

The `_custom_route_mapper` in `mcp_server.py` includes only routes tagged with `"mcp"` and excludes everything else.

## API Key Authentication

API keys provide an alternative to JWT tokens for programmatic access. The `get_current_user` dependency in `backend/src/common/dependencies.py` accepts both:

- **JWT tokens** — standard OAuth2 bearer tokens from the login flow
- **API keys** — strings prefixed with `dats_`, passed as `Authorization: Bearer dats_...`

Keys are stored hashed in the database. The full key is shown to the user only once at creation time.

### API Key Endpoints

| Endpoint                    | Method | Description                                                |
| --------------------------- | ------ | ---------------------------------------------------------- |
| `/api-keys/create`          | POST   | Generate a new API key with a name and optional expiration |
| `/api-keys/list`            | GET    | List all active API keys for the current user              |
| `/api-keys/delete/{key_id}` | DELETE | Revoke an API key                                          |
| `/api-keys/mcp-config`      | GET    | Get a ready-to-use MCP client configuration snippet        |

### Expiry Durations

Keys can be created with the following expiration periods: `1_month`, `3_months`, `6_months`, `1_year` (default), `3_years`, or `never`.

## Connecting an MCP Client

Users can copy a pre-filled MCP client configuration from their profile page (**API Keys** section → **Copy MCP Config**), or construct it manually:

```json
{
  "dats-mcp-server": {
    "command": "npx",
    "args": ["mcp-remote", "https://<your-dats-instance>/mcp", "--header", "Authorization: Bearer <your-api-key>"]
  }
}
```

Replace `<your-api-key>` with a key created in the DATS profile page.
