---
name: Agent PR Review
emoji: 🔍
description: Review pull request changes for actionable security and correctness risks
intent: Give pull request authors and reviewers a focused, current assessment of actionable risks without duplicating reviews or changing repository state.
on:
  pull_request:
    types: [opened, synchronize]
  workflow_dispatch:
    inputs:
      pr_number:
        description: PR number to review
        required: true
        type: number
permissions:
  contents: read
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
  group: agent-pr-review-${{ github.event.pull_request.number || github.event.inputs.pr_number }}
  cancel-in-progress: true
  job-discriminator: ${{ github.run_id }}
checkout:
  - ref: refs/pull/${{ github.event.pull_request.number || github.event.inputs.pr_number }}/head
    fetch-depth: 0
tools:
  github:
    mode: gh-proxy
    toolsets: [context, pull_requests]
  bash: [cat, find, grep, head, ls, sed, tail, wc]
  edit: false
safe-outputs:
  threat-detection: {}
  add-comment:
    max: 1
    target: ${{ github.event.pull_request.number || github.event.inputs.pr_number }}
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

# Pull Request Review

Review pull request `${{ github.event.pull_request.number || github.event.inputs.pr_number }}` in `${{ github.repository }}` and publish one focused review comment for its current head commit.

## Constraints

- Process only pull request `${{ github.event.pull_request.number || github.event.inputs.pr_number }}` in `${{ github.repository }}`.
- Do not modify, create, or delete repository files. Do not change the PR's code, branch, title, body, labels, state, assignees, reviewers, or reviews.
- Keep all GitHub access read-only except for the configured `add-comment` safe output.
- Do not merge, close, approve, or request changes on the PR.
- Publish at most one comment and only after completing the review. If the required data is unavailable or the current head was already reviewed, call `noop` with a short reason.

## Procedure

1. Use the GitHub context tools to identify the authenticated automation user.
2. Use the GitHub pull request tools to read the target PR's title, body, complete head SHA, comments, changed files, commits, and diff. Confirm that its number and repository match the triggering context; otherwise call `noop` and stop.
3. In comments authored by the authenticated automation user, look for `Reviewed commit: \`<head-sha>\``. If a comment contains the complete current head SHA, call `noop` with a duplicate reason and stop.
4. Review the diff and changed files. Read important files from the checked-out PR head only when the diff does not provide enough surrounding context. Follow `AGENTS.md`, `.github/copilot-instructions.md`, and applicable repository instruction files.
5. Report only actionable findings introduced by the PR:
   - **Security:** hardcoded secrets, injection risks, missing authorization, unsafe deserialization, or exposed sensitive data.
   - **Correctness:** logic errors, unhandled edge cases, missing error handling, invalid state transitions, or race conditions.
   - **Repository conventions:** meaningful deviations from established project patterns that can cause defects or maintenance risks.
6. Do not report speculative concerns, existing unrelated problems, general praise, or formatting/style issues already enforced by automated tooling.
7. Use `add-comment` exactly once to publish the complete review. If there are no findings, still publish the concise successful review described below.

## Comment format

```markdown
## 🤖 Automated Review (pr-reviewer)

Reviewed commit: `<complete-head-sha>`

### Summary

<2–4 sentences describing what the PR changes and the areas reviewed.>

### Findings

- <severity, file path and line when available, concise impact, and actionable correction>
```

Order findings by severity using `🔴 high`, `🟡 medium`, then `🔵 low`. If there are no actionable findings, replace the findings list with `No issues found. ✅`. Always end with the `Reviewed commit:` line containing the complete current head SHA.
