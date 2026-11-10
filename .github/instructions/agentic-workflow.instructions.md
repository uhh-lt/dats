---
applyTo: ".github/workflows/agent-*.md"
paths:
  - ".github/workflows/agent-*.md"
---

# Agentic Workflows

> **Scope**: The prompts and frontmatter of our GitHub Agentic Workflows. For setup, access and engine configuration, see [github-agentic-workflows.md](docs/development/github-agentic-workflows.md).

## Prompt Structure

- Start with a one-sentence intro, then use `## Rules`, `## Steps`, `## Situations` and `## Templates`, in that order.
- Leave out `## Situations` if the agent has only one path.
- Add another section only for something specific to that agent, like `## What to report`.

## Sections

- **Rules:** state what the agent may never do, and when to call `noop` and stop.
- **Steps:** number what to read and check, and end with "Follow the first matching situation below."
- **Situations:** number them, give each an `Action:` and a `Comment:` line, and order them so the first match wins.
- **Templates:** give the exact format of everything the agent posts, plus how to write it.

## Style

- Use short text blocks, not tables.
- When a prompt gets confusing, simplify it instead of adding more text.
- Comment only when there is something new to say, otherwise call `noop`.

## Configuration and Testing

- Set `report-failure-as-issue: ["!engine_driver_failure"]` on every agent, so a model outage opens no issue.
- Set `models.default-ai-credits-pricing` instead of pricing a named model, so changing `COPILOT_MODEL` needs no recompile.
- Set `hide-older-comments: true` on agents that post a new comment each time.
- Never edit a `.lock.yml` by hand: run `gh aw compile <name>` and commit it with the prompt.
- A pull request's own agent runs use the prompt from `main`, so prompt changes only get tested after merging.
