import asyncio

import httpx2
import pytest
from fastapi import FastAPI
from fastmcp import Client
from mcp_types import Tool

from systems.mcp_system.mcp_server import create_mcp_server


async def _no_auth(request: httpx2.Request) -> None:
    """Listing tools sends no requests to the app, so no credentials are needed."""


def list_mcp_tools(app: FastAPI, tags: list[str] | None = None) -> dict[str, Tool]:
    """The tools an MCP client sees, by name, built like the DATS MCP server (all
    MCP routes) or like an agent's toolset (`tags`)."""

    async def _list() -> list[Tool]:
        server = create_mcp_server(app=app, name="test", auth_hook=_no_auth, tags=tags)
        async with Client(server) as mcp_client:
            return await mcp_client.list_tools()

    return {tool.name: tool for tool in asyncio.run(_list())}


@pytest.fixture(scope="session")
def mcp_tools(app: FastAPI) -> dict[str, Tool]:
    """The tools of the DATS MCP server, by name. FastMCP names a tool after its
    route's operation id with "-" replaced by "_" (`project_delete_project`).

    Non-obvious derived behavior:
    - Only routes with the "mcp" tag are tools. Most routers carry it for all their
      routes; the user router sets it per route and leaves out `update_me` and
      `delete_me`, so MCP clients can never change or delete an account.
    - Only GET tools are read-only; POST (search, counts, job starts), PUT
      (create) and PATCH (update) tools are not destructive, except the PATCH
      routes marked with `MCP_DESTRUCTIVE_EXTENSION`: `tag_set_tags_batch`
      (unlinks tags), `user_associate_user_to_project` (shares the project) and
      the bulk updates (`*_bulk`, `tag_update_tags_batch`). DELETE tools are
      destructive.
    """
    return list_mcp_tools(app)
