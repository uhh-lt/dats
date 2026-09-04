# GitHub Agentic Workflows

DATS uses [GitHub Agentic Workflows](https://github.github.com/gh-aw/) (`gh-aw`) for AI-powered repository automation.
These workflows run on GitHub-hosted runners and are separate from the self-hosted runner fleet described in [Configure GitHub Action Runners](github-action-runner.md).

## How agentic workflows work

An agentic workflow has two committed files under `.github/workflows/`:

- `<name>.md` is the source maintained by developers. YAML frontmatter configures its trigger, permissions, engine, tools, network access, and safe outputs; the Markdown body is the agent prompt.
- `<name>.lock.yml` is the generated GitHub Actions workflow executed by GitHub. Do not edit it manually.

Both files must be committed together. The lock file contains hashes of the source frontmatter and prompt. GitHub rejects an outdated lock file, so every source change must be followed by compilation.

The agent itself receives read-only GitHub permissions. Mutations such as updating a pull request or adding a comment are declared through `safe-outputs`; gh-aw validates the requested output and applies it in a separate, permission-controlled job.

For example, the PR overview workflow is maintained in [`agent-pr-overview.md`](https://github.com/uhh-lt/dats/blob/main/.github/workflows/agent-pr-overview.md), with the generated workflow in [`agent-pr-overview.lock.yml`](https://github.com/uhh-lt/dats/blob/main/.github/workflows/agent-pr-overview.lock.yml).

## Install the CLI extension

Install and authenticate the [GitHub CLI](https://cli.github.com/), then install the gh-aw extension:

```bash
gh auth status
gh extension install github/gh-aw
gh aw version
```

Upgrade an existing installation before creating or substantially updating a workflow:

```bash
gh extension upgrade aw
```

If extension installation encounters authentication problems, use the [official installation script](https://raw.githubusercontent.com/github/gh-aw/main/install-gh-aw.sh).

## Create a workflow

When asking a coding agent to create or update a workflow, give it the official [gh-aw creation instructions](https://raw.githubusercontent.com/github/gh-aw/main/create.md). Those instructions route the task to the detailed gh-aw workflow designer and require the relevant references to be read before files are changed.

A new workflow should be added as `.github/workflows/<name>.md`. Keep the agent job read-only, enable only the required toolsets, and route every GitHub mutation through `safe-outputs`.

Compile the workflow from the repository root:

```bash
gh aw compile <name> --strict
gh aw compile <name> --validate
```

If compilation requests approval for a newly referenced secret, review the secret name and compile with:

```bash
gh aw compile <name> --strict --approve
```

Review and commit both resulting files:

```text
.github/workflows/<name>.md
.github/workflows/<name>.lock.yml
```

Generated lock files are intentionally tracked and marked as generated through `.gitattributes`.

## Minimize agent access

Every workflow must follow least privilege: give the agent only the tools, GitHub data, repository permissions, and network access required for its stated task. Extra capabilities increase the impact of a mistaken or manipulated tool call and make the workflow harder to review.

Apply this rule across the complete workflow configuration:

- Select the smallest GitHub `toolsets` list that covers the required reads. Do not use `default` or `all` merely for convenience.
- Match `permissions` to those toolsets, using read access only. For example, `repos` generally needs `contents: read`, `issues` needs `issues: read`, and `pull_requests` needs `pull-requests: read`.
- Restrict `bash` to the commands the task actually needs. An empty list disables shell commands entirely.
- Set `edit: false` when the agent does not need to modify files.
- Declare only the required `safe-outputs`. These are the controlled write operations available after agent execution; they do not require direct write permission in the agent job.
- Allow only required network destinations. Network access is a separate capability and should not be broader than the configured tools and engine require.
- For custom MCP servers, restrict their `allowed` tools instead of exposing the server's complete API.

For example, a PR reporting workflow that reads repository files and PR conversations but never edits the checkout can use:

```yaml
permissions:
  contents: read
  issues: read
  pull-requests: read
tools:
  github:
    mode: gh-proxy
    toolsets: [repos, issues, pull_requests]
  bash: [cat, find, grep, head, sed, tail, wc]
  edit: false
safe-outputs:
  add-comment:
    pull-requests: true
```

Tool availability and configuration are documented in two places:

- The [tools reference](https://github.github.com/gh-aw/reference/tools/) lists built-in tools such as `bash`, `edit`, web access, Playwright, memory, and custom MCP integrations.
- The [GitHub tools reference](https://github.github.com/gh-aw/reference/github-tools/) lists the available GitHub toolsets and the individual-tool `allowed` option. Common toolsets include `repos`, `issues`, `pull_requests`, and `actions`; consult the reference instead of assuming the list is stable.

After choosing the tools, compile in strict mode and inspect the configured MCP tools:

```bash
gh aw compile <name> --strict
gh aw mcp inspect <name>
```

Review tool access again whenever the workflow's prompt or responsibilities change. Remove capabilities that are no longer used.

## Update an existing workflow

1. Edit only `.github/workflows/<name>.md`.
2. Run `gh aw compile <name> --strict`.
3. Run `gh aw compile <name> --validate`.
4. Review changes to both the Markdown source and lock file.
5. Commit and push both files together.

If an Actions run reports `CONFIG_HASH_MISMATCH`, the committed lock file does not correspond to the committed Markdown source. Recompile and commit the regenerated lock file.

## DATS engine configuration

The PR overview uses the Copilot engine in BYOK mode. Here, Copilot is the agent harness managed by gh-aw; inference is routed to the configured OpenAI-compatible HCDS endpoint. These settings belong in **GitHub repository settings**.

Configure the following under **Settings → Secrets and variables → Actions**.

Repository variables:

| Variable                    | Value                                                                         |
| --------------------------- | ----------------------------------------------------------------------------- |
| `COPILOT_PROVIDER_BASE_URL` | `https://llm.api.hcds.uni-hamburg.de/v1`                                      |
| `COPILOT_PROVIDER_TYPE`     | `openai`                                                                      |
| `COPILOT_PROVIDER_WIRE_API` | The API supported by the selected model, such as `responses` or `completions` |
| `COPILOT_MODEL`             | The model identifier exposed by HCDS                                          |

Repository secret:

| Secret                     | Value            |
| -------------------------- | ---------------- |
| `COPILOT_PROVIDER_API_KEY` | The HCDS API key |

Never store the API key as a repository variable or commit it to a workflow. GitHub variables are not secret.

The workflow's network allowlist is compiled into the lock file. Changing the provider to a host outside the configured `*.uni-hamburg.de` scope requires updating the Markdown workflow and recompiling it.

## Running and debugging

Agentic workflows appear in the repository's **Actions** tab like other GitHub Actions workflows. Useful commands include:

```bash
gh aw status
gh aw run <name>
gh aw logs <name>
gh aw audit <run-id>
```

Use the [gh-aw debugging instructions](https://raw.githubusercontent.com/github/gh-aw/main/debug.md) when investigating a failed or unexpected run.

## Further reading

- [GitHub Agentic Workflows quickstart](https://github.github.com/gh-aw/setup/quick-start/)
- [CLI command reference](https://github.github.com/gh-aw/setup/cli/)
- [GitHub tools and toolsets](https://github.github.com/gh-aw/reference/github-tools/)
- [Safe outputs](https://github.github.com/gh-aw/reference/safe-outputs/)
- [Copilot BYOK mode](https://github.github.com/gh-aw/reference/engines/#copilot-bring-your-own-key-byok-mode)
