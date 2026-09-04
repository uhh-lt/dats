---
name: Agent PR Overview
emoji: 📝
description: Generate a current overview when a pull request is opened or updated
intent: Keep every pull request's purpose and important changes easy for reviewers to understand without publishing duplicate overviews.
on:
  pull_request:
    types: [opened, synchronize]
    forks: ["*"]
  workflow_dispatch:
    inputs:
      pr_number:
        description: PR number to summarize
        required: true
        type: number
  roles: all
permissions:
  contents: read
  issues: read
  pull-requests: read
engine:
  id: copilot
  env:
    COPILOT_PROVIDER_BASE_URL: ${{ vars.COPILOT_PROVIDER_BASE_URL }}
    COPILOT_PROVIDER_API_KEY: ${{ secrets.COPILOT_PROVIDER_API_KEY }}
    COPILOT_MODEL: ${{ vars.COPILOT_MODEL }}
    COPILOT_PROVIDER_TYPE: ${{ vars.COPILOT_PROVIDER_TYPE }}
    COPILOT_PROVIDER_WIRE_API: ${{ vars.COPILOT_PROVIDER_WIRE_API }}
models:
  providers:
    github-copilot:
      models:
        moonshotai/Kimi-K3:
          cost:
            input: "0"
            output: "0"
strict: true
runs-on: ubuntu-latest
runs-on-slim: ubuntu-slim
concurrency:
  group: agent-pr-overview-${{ github.event.pull_request.number || github.event.inputs.pr_number }}
  cancel-in-progress: true
  job-discriminator: ${{ github.run_id }}
checkout:
  - ref: refs/pull/${{ github.event.pull_request.number || github.event.inputs.pr_number }}/head
    fetch-depth: 0
tools:
  github:
    mode: gh-proxy
    toolsets: [repos, issues, pull_requests]
  bash: [cat, find, grep, head, sed, tail, wc]
  edit: false
safe-outputs:
  threat-detection: {}
  update-pull-request:
    title: false
    body: true
    operation: replace
    update-branch: false
    max: 1
    target: "*"
  add-comment:
    max: 1
    target: "*"
    issues: false
    pull-requests: true
  noop:
    report-as-issue: false
  missing-tool:
    create-issue: false
  missing-data:
    create-issue: false
  report-incomplete:
    create-issue: false
network:
  allowed:
    - defaults
    - github
    - "*.uni-hamburg.de"
---

# Pull Request Overview

Generate an up-to-date overview for pull request `${{ github.event.pull_request.number || github.event.inputs.pr_number }}` in `${{ github.repository }}`.

## Constraints

- Process only pull request `${{ github.event.pull_request.number || github.event.inputs.pr_number }}` in `${{ github.repository }}`.
- Do not modify repository files or the pull request's code, state, title, labels, reviews, or branch.
- Use GitHub only for read operations. Use the configured safe outputs for the single permitted publication action.
- Mention only issue references found in the pull request title or body; do not search for unrelated issues.

## Procedure

1. Use the GitHub pull request tools to read the target PR's title, body, head SHA, comments, changed files, commits, and diff. Read important changed files from the checked-out PR head only when the diff does not explain intent.
2. Confirm the required PR data is complete and internally consistent. If it is not, call `noop` with a short reason and stop.
3. Look for `<!-- pr-overview: <head-sha> -->` in the PR body and comments. If either contains the complete current head SHA, call `noop` with a short duplicate reason and stop without publishing.
4. Write an overview that:
   - starts with a clear 2–4 sentence summary of the PR's purpose and effect;
   - is summary-only for a small, single-concern PR;
   - for a larger PR, adds grouped `##` sections, each with a short explanation and bullets for the important changes;
   - includes related issue references only when present in the PR title or body; and
   - ends with `<!-- pr-overview: <head-sha> -->` using the complete current head SHA.
5. Publish exactly once:
   - If the existing PR body is empty, use `update-pull-request` to replace only the body of the target PR with the overview.
   - Otherwise, use `add-comment` to post the overview once on the target PR.
   - Never overwrite a non-empty PR body and never publish to both locations.

## Output shape

```markdown
<2–4 sentence summary>

<related issue references, only when present>

---

## <Detailed group, only for larger PRs>

<short group explanation>

- **<Change>** — <why it matters>

<!-- pr-overview: <complete-head-sha> -->
```

If no publication is required, call `noop` with a concise explanation.
