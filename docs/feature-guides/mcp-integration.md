# Connecting AI Tools via MCP

DATS includes a built-in [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that lets you connect external AI tools — like Claude Code, GitHub Copilot, VS Code, or any MCP-compatible client — directly to your DATS projects. Once connected, the AI can search your documents, read annotations, manage codes, and much more, all through natural language.

This is different from the built-in [LLM Assistant](llm-assistant.md), which runs inside DATS. MCP lets _your own_ AI tool access DATS from the outside.

## 1. Create an API Key

Before connecting any tool, you need a personal API key to authenticate.

1. Click your **User Icon** at the bottom left of the Navigation Bar.
2. In the profile sidebar, select **API Keys**.
3. Click **Add API Key**.
4. Give the key a descriptive **Name** (e.g., "Claude Code" or "VS Code Copilot") so you can identify it later.
5. Choose an **expiration period** (default: 1 year). Pick "Never" only if you understand the security implications.
6. Click **Create API Key**.

!!! warning "Copy your key immediately!"

    The full API key is shown **only once**. Copy it now and store it securely — you cannot retrieve it later. If you lose it, delete the key and create a new one.

## 2. Get the MCP Configuration

DATS can generate a ready-to-use MCP client configuration for you:

1. On the **API Keys** page, click **Copy MCP Config**.
2. This copies a JSON snippet to your clipboard that looks like this:

```json
{
  "dats-mcp-server": {
    "command": "npx",
    "args": ["mcp-remote", "https://<your-dats-instance>/mcp", "--header", "Authorization: Bearer API_KEY_HERE"]
  }
}
```

3. Replace `API_KEY_HERE` with the API key you created in Step 1.

## 3. Configure Your AI Tool

Paste the configuration into your tool's MCP settings. The exact location depends on the tool:

### Claude Code (CLI)

Add the snippet to your Claude Code MCP settings file (`.claude/mcp.json` in your project, or `~/.claude/mcp.json` globally):

```json
{
  "mcpServers": {
    "dats-mcp-server": {
      "command": "npx",
      "args": ["mcp-remote", "https://<your-dats-instance>/mcp", "--header", "Authorization: Bearer <your-api-key>"]
    }
  }
}
```

### VS Code (GitHub Copilot)

Add the server to your VS Code `settings.json` under `mcp.servers`, or use the **MCP: Add Server** command from the Command Palette (`Ctrl+Shift+P`).

### Other MCP Clients

Any MCP-compatible client that supports remote servers via `mcp-remote` can connect. Refer to your tool's documentation for where to place MCP server configurations.

!!! tip "Prerequisites"

    The `npx` command requires [Node.js](https://nodejs.org/) to be installed on your machine. Most development environments already have it.

## 4. Start Using It

Once configured, your AI tool will discover the available DATS tools automatically. You can then ask things like:

- _"List all my DATS projects"_
- _"Search for documents about climate change in project 3"_
- _"Show me the codes in my project"_
- _"Create a memo on document 42"_

The AI operates with **your permissions** — it can only access projects and data that your DATS account has access to.

## Managing API Keys

You can view all your API keys on the **API Keys** page in your profile. The table shows each key's name, prefix, creation date, and expiration status.

To revoke a key (e.g., if it's compromised or no longer needed), click the **Delete** icon next to it. The key stops working immediately.

## Security Notes

- API keys are stored **hashed** on the server — DATS never stores the plaintext key.
- Each key is tied to your user account and inherits your permissions.
- Expired keys are rejected automatically.
- Delete keys you no longer use to minimize your attack surface.
