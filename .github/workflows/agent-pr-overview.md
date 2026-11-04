---
name: Agent PR Overview
emoji: 📝
description: Generate a current overview when a pull request's description leaves out its purpose or important changes
intent: Keep every pull request's purpose and important changes easy for reviewers to understand without publishing duplicate overviews.
on:
  pull_request:
    types: [opened, synchronize]
  workflow_dispatch:
    inputs:
      pr_number:
        description: PR number to summarize
        required: true
        type: number
permissions:
  contents: read
  issues: read
  pull-requests: read
max-turns: 500
max-turn-cache-misses: 500
timeout-minutes: 40
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
  needs: [prepare]
  report-failure-as-issue: ["!engine_driver_failure"]
  threat-detection: {}
  add-comment:
    max: 1
    target: "*"
    allows-comment-ids:
      - ${{ needs.prepare.outputs.comment_ids }}
    issues: false
    pull-requests: true
  noop:
    report-as-issue: false
  report-missing-tool:
    create-issue: false
  report-missing-data:
    create-issue: false
  report-incomplete:
    create-issue: false
network:
  allowed:
    - defaults
    - github
    - "*.uni-hamburg.de"
jobs:
  prepare:
    runs-on: ubuntu-slim
    permissions:
      issues: read
      pull-requests: read
    outputs:
      comment_ids: ${{ steps.lookup.outputs.comment_ids }}
    steps:
      - id: lookup
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ github.event.pull_request.number || github.event.inputs.pr_number }}
        run: |
          id=$(gh api "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" --paginate --jq '[.[] | select(.body | contains("gh-aw-workflow-call-id: uhh-lt/dats/agent-pr-overview") and contains("## 📝 Pull Request Overview"))][-1].id // empty')
          echo "comment_ids=${id}" >> "$GITHUB_OUTPUT"
---

# Pull Request Overview

Keep one current overview comment on pull request `${{ github.event.pull_request.number || github.event.inputs.pr_number }}` in `${{ github.repository }}`, unless its description already says everything the overview would.

The previous overview comment's ID, empty if there is none: `${{ needs.prepare.outputs.comment_ids }}`

## Rules

- Process only this pull request.
- Change nothing: no repository files and nothing on the pull request. Write to GitHub only through `add-comment`.
- Call `add-comment` at most once. When a situation below asks for no comment, call `noop` with a short reason instead.
- If the required data is incomplete, call `noop` and stop.
- Mention only issue references found in the pull request's title or body.

## Steps

1. Read the pull request's title, body, head SHA, changed files, commits, and diff. Read changed files from the checked-out head only when the diff does not explain intent.
2. If there is a previous overview comment ID, fetch that comment and read the SHA on its `Commit:` line.
3. Follow the first matching situation below.

## Situations

1. The previous overview's `Commit:` SHA is the current head.
   - Action: none.
   - Comment: none.
2. There is a previous overview comment.
   - Action: write a new overview of the current head.
   - Comment: update it, passing exactly the ID above as `comment_id` and replacing its whole body.
3. The description explains the purpose and all important changes at the current head.
   - Action: none.
   - Comment: none.
4. The description is missing, too short, or leaves out important changes.
   - Action: write an overview of the current head.
   - Comment: create it, and omit `comment_id`.

Judge only the description against the diff, not who opened the pull request.

## Overview

- Start with a 2–4 sentence summary of the purpose and effect.
- Stop there for a small, single-concern pull request.
- For a larger one, add grouped `##` sections with a short explanation and bullets for the important changes.

```markdown
## 📝 Pull Request Overview

<2–4 sentence summary>

<related issue references, only when present>

---

## <Detailed group, only for larger pull requests>

<short group explanation>

- **<Change>** — <why it matters>

Commit: `<complete-head-sha>`
```
