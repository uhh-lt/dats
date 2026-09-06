---
name: Agent PR Overview
emoji: 📝
description: Generate a current overview when a pull request is opened or updated
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
          id=$(gh api "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" --paginate --jq '[.[] | select(.body | contains("gh-aw-workflow-id: agent-pr-overview"))][-1].id // empty')
          echo "comment_ids=${id}" >> "$GITHUB_OUTPUT"
---

# Pull Request Overview

Maintain a single, always-current overview comment on pull request `${{ github.event.pull_request.number || github.event.inputs.pr_number }}` in `${{ github.repository }}`.

A prepare step has already looked up the previous overview comment for this pull request. Its numeric comment ID is: `${{ needs.prepare.outputs.comment_ids }}`

- If that ID is not empty, a previous overview comment exists: fetch that comment by ID, and update it in place (step 7).
- If that ID is empty, no previous overview comment exists: create a new one (step 7).

## Constraints

- Process only pull request `${{ github.event.pull_request.number || github.event.inputs.pr_number }}` in `${{ github.repository }}`.
- Do not modify repository files or the pull request's code, state, title, body, labels, reviews, or branch.
- Use GitHub only for read operations. Use the configured `add-comment` safe output for the single permitted publication action.
- Mention only issue references found in the pull request title or body; do not search for unrelated issues.
- Never post a second overview comment: update the existing one instead. Never edit or delete anyone else's comments.

## Procedure

1. Use the GitHub pull request tools to read the target PR's title, body, head SHA, changed files, commits, and diff. Read important changed files from the checked-out PR head only when the diff does not explain intent.
2. Confirm the required PR data is complete and internally consistent. If it is not, call `noop` with a short reason and stop.
3. If the prepare step reported a comment ID above, fetch that comment and read the complete SHA on its `Commit:` line. If it already matches the complete current head SHA, call `noop` with a short duplicate reason and stop without publishing.
4. Write an overview of the PR at its current head that:
   - starts with a clear 2–4 sentence summary of the PR's purpose and effect;
   - is summary-only for a small, single-concern PR;
   - for a larger PR, adds grouped `##` sections, each with a short explanation and bullets for the important changes;
   - includes related issue references only when present in the PR title or body; and
   - ends with a visible `Commit: \`<complete-head-sha>\`` line using the complete current head SHA.
5. Publish exactly once using `add-comment`:
   - If the prepare step reported a comment ID above, update that comment by passing the ID as `comment_id` together with the PR number, replacing its whole body with the new overview. Pass exactly this ID — it is the only one on the trusted allowlist; any other ID will be rejected.
   - Otherwise, create the overview comment on the target PR. In this case you must omit `comment_id` entirely — never guess, reuse, or invent a comment ID, because only IDs from the trusted prepare-step allowlist are accepted and an unlisted ID will be rejected.

## Output shape

```markdown
## 📝 Pull Request Overview

<2–4 sentence summary>

<related issue references, only when present>

---

## <Detailed group, only for larger PRs>

<short group explanation>

- **<Change>** — <why it matters>

Commit: `<complete-head-sha>`
```

If no publication is required, call `noop` with a concise explanation.
