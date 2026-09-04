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
