# MCP Server & API Keys

DATS exposes a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that allows AI assistants and external tools to interact with your projects programmatically. Users authenticate to the MCP server (and the REST API) via personal API keys.

## Architecture

The MCP server is built with [FastMCP](https://github.com/jlowin/fastmcp) and mounted directly onto the FastAPI application in `backend/src/main.py`. It re-uses the existing FastAPI routes — any endpoint tagged with `"mcp"` is automatically exposed as an MCP tool.

```
Client (Claude, Copilot, ...) ──MCP──► FastMCP ──► FastAPI routes ──► DATS backend
```

Key files:

- `backend/src/systems/mcp_system/mcp_server.py` — MCP server setup, route mapping, and auth forwarding
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

## Developing with Claude Desktop

When developing the MCP server locally, Claude Desktop cannot connect to the Vite dev server directly: it enforces HTTPS with a trusted certificate, and the self-signed cert from `@vitejs/plugin-basic-ssl` is rejected. The recommended workaround is a **stdio bridge**: let Claude Desktop launch `mcp-remote`, a small local proxy that talks to the backend over plain HTTP through your existing SSH port forward.

The SSH tunnel is already encrypted and `localhost` is a safe origin, so TLS is unnecessary. This also removes the Vite proxy from the picture — a dev proxy can buffer the streaming responses that MCP's HTTP transport uses.

### Setup

1. **Forward the backend port** (not the Vite port) over SSH.

2. **Open the Claude Desktop config.** In Claude Desktop, go to **Settings → Developer → Edit Config**. It reveals `claude_desktop_config.json`.

3. **Add the `mcpServers` key** as a new top-level entry. If the file doesn't exist yet or is just `{}`, put this in it:

   ```json
   {
     "mcpServers": {
       "dats-mcp": {
         "command": "npx",
         "args": [
           "-y",
           "mcp-remote",
           "http://localhost:BACKEND_PORT/mcp",
           "--allow-http",
           "--header",
           "Authorization: Bearer <your-api-key>"
         ]
       }
     }
   }
   ```

4. **Replace the placeholders:**
   - `BACKEND_PORT` — the local port forwarding to the backend (e.g. `10120`)
   - `<your-api-key>` — an API key from your DATS profile page

5. **Fully quit Claude Desktop with Cmd+Q and reopen it.** A regular window close is not enough.
