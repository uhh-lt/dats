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
- Publish at most one comment and only after completing the review. The comment is either an initial review or a follow-up review, as decided by the procedure below. If the required data is unavailable or the current head was already reviewed, call `noop` with a short reason.

## Procedure

1. Use the GitHub context tools to identify the authenticated automation user.
2. Use the GitHub pull request tools to read the target PR's title, body, complete head SHA, comments, changed files, commits, and diff. Confirm that its number and repository match the triggering context; otherwise call `noop` and stop.
3. In comments authored by the authenticated automation user, look for `Reviewed commit: \`<head-sha>\``. If a comment contains the complete current head SHA, call `noop` with a duplicate reason and stop.
4. Among the automation user's comments, find the latest earlier comment containing the `## 🤖 Automated Review (pr-reviewer)` header. This is the previous review. Extract from it:
   - the complete SHA from its `Reviewed commit:` line (the previous reviewed commit),
   - its comment URL (for linking back), and
   - its findings list with their IDs (`F1`, `F2`, ...), severities, and descriptions.
     If no such comment exists, this is an initial review; skip step 6.
5. Review the diff and changed files at the current head. Read important files from the checked-out PR head only when the diff does not provide enough surrounding context. Follow `AGENTS.md`, `.github/copilot-instructions.md`, and applicable repository instruction files.
6. Follow-up only — classify the previous review's findings and detect new ones:
   a. Compare the previous reviewed commit with the current head (the checkout has full history; use the PR's commit list and changed files to see what changed since).
   b. For each previous finding ID, inspect the flagged code at the current head and classify it as **addressed** (the flagged code was fixed or removed) or **still unresolved** (the flagged code is still present and the issue still applies). Record one line of evidence per classification (e.g. what changed, or that the code is unchanged).
   c. Review the code changed since the previous reviewed commit for new actionable findings. Assign fresh IDs continuing the previous numbering (if the highest previous ID was `F3`, new findings start at `F4`).
   d. If the previous review had no findings, skip the classification and only report new findings (or the clean state).
7. Report only actionable findings introduced by the PR:
   - **Security:** hardcoded secrets, injection risks, missing authorization, unsafe deserialization, or exposed sensitive data.
   - **Correctness:** logic errors, unhandled edge cases, missing error handling, invalid state transitions, or race conditions.
   - **Repository conventions:** meaningful deviations from established project patterns that can cause defects or maintenance risks.
8. Do not report speculative concerns, existing unrelated problems, general praise, or formatting/style issues already enforced by automated tooling.
9. Use `add-comment` exactly once to publish the complete review, using the initial or follow-up format below. If there are no findings, still publish the concise successful review described below.

## Comment format

### Initial review (no previous review comment exists)

```markdown
## 🤖 Automated Review (pr-reviewer)

Reviewed commit: `<complete-head-sha>`

### Summary

<2–4 sentences describing what the PR changes and the areas reviewed.>

### Findings

- **F1** <severity emoji> <file path and line when available>: <concise impact and actionable correction>
- **F2** ...
```

Number findings `F1`, `F2`, ... in severity order using `🔴 high`, `🟡 medium`, then `🔵 low`. If there are no actionable findings, replace the findings list with `No issues found. ✅`.

### Follow-up review (a previous review comment exists)

```markdown
## 🤖 Automated Review (pr-reviewer)

Reviewed commit: `<complete-head-sha>`

Previous review: <previous comment URL> (commit `<short-sha of previous reviewed commit>`)

### Summary

<1–3 sentences describing what changed since the previous review.>

### ✅ Addressed

- **F1** <one line: what was fixed and where>

### ⚠️ Still unresolved

- **F2** <severity emoji> <one-line restatement of the issue> — see the previous review linked above for details.

### 🆕 New findings

- **F4** <severity emoji> <file path and line when available>: <concise impact and actionable correction>
```

- Omit the `✅ Addressed` or `⚠️ Still unresolved` section when it would be empty. If the previous review had no findings, omit both.
- Replace the `🆕 New findings` list with `No new issues found.` when there are none.
- If the previous review had no findings and there are no new findings, keep the comment short: state that the new commits introduce no actionable issues and the PR is still clean.
- New findings continue the ID numbering from the previous review and are ordered by severity (`🔴`, `🟡`, `🔵`).

Always end the comment with the `Reviewed commit:` line containing the complete current head SHA.
