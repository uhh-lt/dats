---
name: Agent PR Documentation
emoji: 📚
description: Assess pull request documentation impact, report the result, and propose required updates
intent: Keep user, developer, and administrator documentation accurate and make each pull request's documentation status visible, with at most one open documentation pull request per source pull request.
on:
  pull_request:
    types: [opened, synchronize]
  workflow_dispatch:
    inputs:
      pr_number:
        description: PR number to check for documentation impact
        required: true
        type: number
      base_branch:
        description: Base branch for the documentation PR
        required: false
        default: main
        type: string
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
  group: agent-pr-documentation-${{ github.event.pull_request.number || github.event.inputs.pr_number }}
  cancel-in-progress: true
  job-discriminator: ${{ github.run_id }}
checkout:
  - ref: refs/pull/${{ github.event.pull_request.number || github.event.inputs.pr_number }}/head
    fetch-depth: 0
tools:
  github:
    mode: gh-proxy
    toolsets: [repos, pull_requests]
  bash: [cat, find, grep, head, ls, sed, tail, wc]
  edit: true
safe-outputs:
  report-failure-as-issue: ["!engine_driver_failure"]
  activation-comments: false
  threat-detection: {}
  create-pull-request:
    title-prefix: "docs: "
    branch-prefix: "docs/sync-pr"
    preserve-branch-name: true
    recreate-ref: true
    base-branch: ${{ github.event.pull_request.head.ref || github.event.inputs.base_branch || 'main' }}
    draft: false
    fallback-as-issue: false
    auto-close-issue: false
    max: 1
    allowed-files:
      - "docs/**"
      - mkdocs.yml
  push-to-pull-request-branch:
    target: "*"
    required-title-prefix: "docs: "
    fallback-as-pull-request: false
    max: 1
    allowed-files:
      - "docs/**"
      - mkdocs.yml
  add-comment:
    max: 1
    target: ${{ github.event.pull_request.number || github.event.inputs.pr_number }}
    hide-older-comments: true
    footer: false
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

# Pull Request Documentation

Keep the documentation of pull request `${{ github.event.pull_request.number || github.event.inputs.pr_number }}` in `${{ github.repository }}` accurate, with at most one open documentation PR and no repeated status comments.

## Rules

- Process only this pull request. The checkout starts on its head.
- Change only `docs/**` and `mkdocs.yml`, and write to GitHub only through the safe outputs.
- Never merge, close, approve, review, or label a pull request, and never rebase.
- Document only real, evidence-backed gaps. Refactors, internal cleanups, test-only changes, and changes without observable behavior need no documentation.
- Call `add-comment` at most once. When the table below asks for no comment, call `noop` with a short reason instead.
- If the pull request cannot be identified or the assessment cannot be completed safely, call `noop` and stop.

## Steps

1. Read the pull request's title, body, base branch, changed files, diff, and comments. Confirm that its number and repository match the triggering context.
2. Look for an **earlier status comment**: a comment on this pull request containing `## 📚 Documentation status`.
3. Look for the **documentation PR**: the most recent pull request in any state titled `docs: sync documentation with #${{ github.event.pull_request.number || github.event.inputs.pr_number }}`. If it is open, read its diff.
4. Decide whether documentation is missing, comparing the changes with `mkdocs.yml`, the existing documentation, and the open documentation PR's diff:
   - **User:** UI behavior, features, settings, and workflows under `docs/feature-guides/` and `docs/workflows/`.
   - **Developer:** setup, commands, tooling, tests, APIs, and architecture under `docs/development/`.
   - **Administrator:** configuration, infrastructure, Docker, and deployment under `docs/admin/`.
5. Follow the first matching row:

| Situation                                          | Action                         | Status comment                                                                          |
| -------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| Documentation PR was closed without merging        | None, a maintainer rejected it | Only without an earlier status comment: **No update required**, linking the rejected PR |
| Documentation is missing, documentation PR is open | Update the documentation PR    | **Update pushed**                                                                       |
| Documentation is missing, no open documentation PR | Create a documentation PR      | **Update created**                                                                      |
| Nothing is missing                                 | None                           | Only without an earlier status comment: **No update required**                          |

## Writing documentation

1. Get onto the documentation branch:
   - To update: `git checkout -b <its head branch> origin/<its head branch>`.
   - To create: `git checkout -b docs/sync-pr-${{ github.event.pull_request.number || github.event.inputs.pr_number }}` from the pull request's head.
2. Make the smallest complete edit with the edit tool. Change `mkdocs.yml` only when navigation must change. Re-read every changed file to verify it is accurate and contains no unrelated edits. Commit on the documentation branch.
3. Publish it:
   - To update: call `push-to-pull-request-branch` with the documentation PR's number, its head branch, and a message summarizing the update.
   - To create: call `create-pull-request` with title `sync documentation with #${{ github.event.pull_request.number || github.event.inputs.pr_number }}`, branch `docs/sync-pr-${{ github.event.pull_request.number || github.event.inputs.pr_number }}`, `draft: false`, `temporary_id: "#aw_docs"`, and a body that starts with `Syncs documentation with #${{ github.event.pull_request.number || github.event.inputs.pr_number }}.`, explains the changes, and says that this PR stacks on the source PR's branch and must be merged after it.

## Status comments

Keep them concise and base them on the assessment.

### Update created

```markdown
## 📚 Documentation status

**Result:** Documentation update created ✅

- **User documentation:** <impact found, or why it was not affected>
- **Developer documentation:** <impact found, or why it was not affected>
- **Administrator documentation:** <impact found, or why it was not affected>

Created #aw_docs for the identified gaps.
```

Write `#aw_docs` literally. gh-aw replaces it with the link to the created documentation PR.

### Update pushed

```markdown
## 📚 Documentation status

**Result:** Documentation update pushed ✅

- **User documentation:** <impact found, or why it was not affected>
- **Developer documentation:** <impact found, or why it was not affected>
- **Administrator documentation:** <impact found, or why it was not affected>

Updated <documentation PR URL> for the identified gaps.
```

### No update required

```markdown
## 📚 Documentation status

**Result:** No documentation update required ✅

<One or two sentences explaining why.>
```
