# Development

This section is for developers and maintainers who contribute to DATS or operate its development infrastructure.

Here you'll find guides for setting up your local development environment, running tests and code-quality checks, and configuring the CI/CD infrastructure that keeps DATS healthy — including self-hosted GitHub Action runners and GitHub Agentic Workflows.

Working on several branches in parallel, for example with coding agents? See [Git Worktrees](worktrees.md) for isolated per-branch dev stacks.

You'll also find architecture references for key subsystems like the [MCP Server & API Keys](mcp-server.md), which powers programmatic access to DATS, and [WebSockets](websockets.md), which power real-time updates in the frontend.

## Domain language and architecture decisions

[`GLOSSARY.md`](https://github.com/uhh-lt/dats/blob/main/GLOSSARY.md) is the single source of truth for DATS domain terminology. Use its terms in code, documentation, issues, and discussions, and make terminology changes there rather than duplicating definitions elsewhere.

Architecture decisions are recorded as numbered ADRs in [`specs/adr/`](https://github.com/uhh-lt/dats/tree/main/specs/adr). Read the glossary and relevant ADRs before designing or reviewing a change. Add an ADR only for a hard-to-reverse, surprising decision that involved a real trade-off.

For an agent-guided review, use the [`improve-codebase-architecture`](https://github.com/uhh-lt/dats/blob/main/.github/skills/improve-codebase-architecture/SKILL.md) skill. It writes a self-contained HTML report to the git-ignored `.architecture-reviews/` directory. The accompanying `codebase-design`, `domain-modeling`, and `grilling` skills help evaluate a selected opportunity and keep the glossary and ADRs current.

If you're a _user_ looking to learn DATS, head to [Getting Started](../getting-started.md) instead.
