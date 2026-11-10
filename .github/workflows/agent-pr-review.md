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
  default-ai-credits-pricing:
    input: 0.000001
    output: 0.000001
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
  report-failure-as-issue: ["!engine_driver_failure"]
  threat-detection: {}
  add-comment:
    max: 1
    target: ${{ github.event.pull_request.number || github.event.inputs.pr_number }}
    hide-older-comments: true
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
---

# Pull Request Review

Review pull request `${{ github.event.pull_request.number || github.event.inputs.pr_number }}` in `${{ github.repository }}` and comment only when there is something new to report.

## Rules

- Process only this pull request.
- Change nothing: no repository files and nothing on the pull request. Write to GitHub only through `add-comment`.
- Never merge, close, approve, or request changes.
- Call `add-comment` at most once. When a situation below asks for no comment, call `noop` with a short reason instead.
- If the required data is unavailable, call `noop` and stop.
- Dependencies are not installed in the checkout. Do not reconstruct library internals from memory: mark such an assumption as unverified and move on.

## What to report

Report only actionable findings introduced by the pull request, following `AGENTS.md` and the applicable files in `.github/instructions/` (each declares its files in its `applyTo` frontmatter):

- **Security:** hardcoded secrets, injection risks, missing authorization, unsafe deserialization, or exposed sensitive data.
- **Correctness:** logic errors, unhandled edge cases, missing error handling, invalid state transitions, or race conditions.
- **Repository conventions:** meaningful deviations from established project patterns that can cause defects or maintenance risks.

Do not report speculative concerns, existing unrelated problems, general praise, or style issues already enforced by tooling.

## Steps

1. Identify the authenticated automation user. Read the pull request's title, body, complete head SHA, comments, changed files, commits, and diff. Confirm that its number and repository match the triggering context.
2. Look for the **previous review**: the automation user's latest comment containing `## 🤖 Automated Review (pr-reviewer)`. Note its `Reviewed commit:` SHA and its findings.
3. Skip this step if that SHA is the current head. Otherwise review the diff, reading files from the checked-out head only when the diff lacks context:
   - Without a previous review: review the whole pull request.
   - With a previous review: review what changed since its commit, and check whether each of its findings was fixed or is still open.
4. Follow the first matching situation below.

## Situations

1. The previous review covers the current head.
   - Action: none.
   - Comment: none.
2. There is no previous review.
   - Action: report the findings.
   - Comment: initial review.
3. A previous finding was fixed, or there is a new finding.
   - Action: report what was fixed, what is still open, and what is new.
   - Comment: follow-up review.
4. Nothing was fixed and nothing is new.
   - Action: none, the previous review still holds.
   - Comment: none.

## Templates

Number findings `F1`, `F2`, ... in severity order: `🔴 high`, `🟡 medium`, `🔵 low`.

### Initial review

```markdown
## 🤖 Automated Review (pr-reviewer)

Reviewed commit: `<complete-head-sha>`

### Summary

<2–4 sentences describing what the pull request changes and the areas reviewed.>

### Findings

- **F1** <severity emoji> <file path and line when available>: <concise impact and actionable correction>
```

Without findings, publish only this:

```markdown
## 🤖 Automated Review (pr-reviewer)

Reviewed commit: `<complete-head-sha>`

No issues found. ✅
```

### Follow-up review

gh-aw hides the previous review, so this comment must stand on its own: restate every open finding in full and never refer to an earlier review. Keep each finding's ID, continue the numbering for new findings, and omit empty sections.

```markdown
## 🤖 Automated Review (pr-reviewer)

Reviewed commit: `<complete-head-sha>`

### Summary

<1–3 sentences describing what changed since the previous review.>

### ✅ Fixed

- **F1** <one line: what was fixed and where>

### ⚠️ Still open

- **F2** <severity emoji> <file path and line when available>: <concise impact and actionable correction>

### 🆕 New findings

- **F3** <severity emoji> <file path and line when available>: <concise impact and actionable correction>
```
