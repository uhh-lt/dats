---
name: Agent PR Documentation
emoji: 📚
description: Keep repository documentation synchronized with pull request changes
intent: Keep user, developer, and administrator documentation accurate when pull requests introduce verifiable documentation gaps without creating duplicate follow-up work.
on:
  pull_request:
    types: [opened, synchronize]
    forks: ["*"]
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
  roles: all
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
  threat-detection: {}
  create-pull-request:
    title-prefix: "docs: "
    branch-prefix: "docs/sync-pr-"
    preserve-branch-name: true
    base-branch: ${{ github.event.pull_request.base.ref || github.event.inputs.base_branch || 'main' }}
    draft: false
    fallback-as-issue: false
    auto-close-issue: false
    max: 1
    allowed-files:
      - "docs/**"
      - mkdocs.yml
  add-comment:
    max: 1
    target: ${{ github.event.pull_request.number || github.event.inputs.pr_number }}
    footer: false
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

# Pull Request Documentation

Review pull request `${{ github.event.pull_request.number || github.event.inputs.pr_number }}` in `${{ github.repository }}` and create one focused documentation pull request only when its changes reveal a verifiable documentation gap.

## Constraints

- Process only pull request `${{ github.event.pull_request.number || github.event.inputs.pr_number }}` in `${{ github.repository }}`.
- Treat the checked-out working tree as the source PR's head. Do not modify source code or any path outside `docs/**` and `mkdocs.yml`.
- Keep the agent job read-only on GitHub. Use only the configured safe outputs for remote writes.
- Do not merge, close, approve, review, label, or otherwise modify the source PR.
- Create at most one documentation PR for a source PR. Never replace or reopen an earlier documentation PR.
- Create a documentation PR only for a real, evidence-backed gap. When uncertain or when no update is necessary, call `noop` with a short reason.

## Procedure

1. Use the GitHub pull request tools to read the target PR's title, body, base branch, changed files, and diff. Confirm that the PR number and repository match the triggering context; otherwise call `noop` and stop.
2. Search all pull requests, including closed ones, for head branch `docs/sync-pr-${{ github.event.pull_request.number || github.event.inputs.pr_number }}`. If a matching documentation PR exists, call `noop` with its reference and stop.
3. Review relevant changed files from the checked-out source PR head, `mkdocs.yml`, and the existing documentation. Assess each applicable perspective:
   - **User:** UI behavior, features, settings, and workflows under `docs/feature-guides/` and `docs/workflows/`.
   - **Developer:** setup, commands, tooling, tests, APIs, and architecture under `docs/development/`.
   - **Administrator:** configuration, infrastructure, Docker, and deployment under `docs/admin/`.
4. Treat pure refactors, internal cleanups, test-only changes, and changes without observable behavior as no-op cases. Call `noop` and stop when the existing documentation remains accurate.
5. When documentation is required, make the smallest complete update using the edit tool. Modify `mkdocs.yml` only when navigation must change. Re-read every changed documentation file and verify it is accurate, internally consistent, and contains no unrelated edits.
6. Call `create-pull-request` exactly once with:
   - title `sync documentation with #${{ github.event.pull_request.number || github.event.inputs.pr_number }}`;
   - branch `${{ github.event.pull_request.number || github.event.inputs.pr_number }}`;
   - body beginning `Syncs documentation with #${{ github.event.pull_request.number || github.event.inputs.pr_number }}.` and briefly explaining the documentation changes; and
   - `draft: false`.
7. Declare one `add-comment` safe output on the source PR with body `Documentation update PR:`. gh-aw will append a Related Items section containing the created documentation PR link.

The configured title and branch prefixes produce `docs: sync documentation with #<number>` and `docs/sync-pr-<number>`. The PR body reference links the documentation PR back to the source PR.
