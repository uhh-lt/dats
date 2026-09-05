---
name: Agent PR Documentation
emoji: 📚
description: Assess pull request documentation impact, report the result, and propose required updates
intent: Keep user, developer, and administrator documentation accurate and make each pull request's documentation status visible without creating duplicate follow-up work.
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
    hide-older-comments: true
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

Review pull request `${{ github.event.pull_request.number || github.event.inputs.pr_number }}` in `${{ github.repository }}`, always report its documentation status on the source PR, and create one focused documentation pull request only when its changes reveal a verifiable documentation gap.

## Constraints

- Process only pull request `${{ github.event.pull_request.number || github.event.inputs.pr_number }}` in `${{ github.repository }}`.
- Treat the checked-out working tree as the source PR's head. Do not modify source code or any path outside `docs/**` and `mkdocs.yml`.
- Keep the agent job read-only on GitHub. Use only the configured safe outputs for remote writes.
- Do not merge, close, approve, review, label, or otherwise modify the source PR.
- Create at most one documentation PR for a source PR. Never replace or reopen an earlier documentation PR.
- Create a documentation PR only for a real, evidence-backed gap.
- For every valid target PR assessment, call `add-comment` exactly once with the applicable status report below, whether or not a documentation PR is required.
- Use `noop` only when the target PR cannot be identified or the assessment cannot be completed safely. Do not use `noop` merely because no documentation update is necessary.

## Procedure

1. Use the GitHub pull request tools to read the target PR's title, body, base branch, changed files, and diff. Confirm that the PR number and repository match the triggering context; otherwise call `noop` and stop.
2. Search all pull requests, including closed ones, for head branch `docs/sync-pr-${{ github.event.pull_request.number || github.event.inputs.pr_number }}`. If a matching documentation PR exists, publish the no-update status report, explain that the documentation work is already tracked, include its URL, and stop without creating another PR.
3. Review relevant changed files from the checked-out source PR head, `mkdocs.yml`, and the existing documentation. Assess each applicable perspective:
   - **User:** UI behavior, features, settings, and workflows under `docs/feature-guides/` and `docs/workflows/`.
   - **Developer:** setup, commands, tooling, tests, APIs, and architecture under `docs/development/`.
   - **Administrator:** configuration, infrastructure, Docker, and deployment under `docs/admin/`.
4. Treat pure refactors, internal cleanups, test-only changes, and changes without observable behavior as cases that do not require a documentation PR. When the existing documentation remains accurate, publish the no-update status report and stop.
5. When documentation is required, make the smallest complete update using the edit tool. Modify `mkdocs.yml` only when navigation must change. Re-read every changed documentation file and verify it is accurate, internally consistent, and contains no unrelated edits.
6. Call `create-pull-request` exactly once with:
   - title `sync documentation with #${{ github.event.pull_request.number || github.event.inputs.pr_number }}`;
   - branch `${{ github.event.pull_request.number || github.event.inputs.pr_number }}`;
   - body beginning `Syncs documentation with #${{ github.event.pull_request.number || github.event.inputs.pr_number }}.` and briefly explaining the documentation changes; and
   - `draft: false`.
7. Publish the update-created status report through `add-comment`. gh-aw will append a Related Items section containing the created documentation PR link.

The configured title and branch prefixes produce `docs: sync documentation with #<number>` and `docs/sync-pr-<number>`. The PR body reference links the documentation PR back to the source PR.

## Status comment templates

Use one of these shapes. Keep the report concise and replace the example text with evidence from the assessment.

### Documentation update created

```markdown
## 📚 Documentation status

**Result:** Documentation update created ✅

### Assessment

- **User documentation:** <impact found, or why it was not affected>
- **Developer documentation:** <impact found, or why it was not affected>
- **Administrator documentation:** <impact found, or why it was not affected>

### Action

Created a focused documentation update for the identified gaps. See the documentation PR in **Related Items** below.
```

### No documentation update required

```markdown
## 📚 Documentation status

**Result:** No documentation update required ✅

### Assessment

- **User documentation:** <why no update is required>
- **Developer documentation:** <why no update is required>
- **Administrator documentation:** <why no update is required>

### Conclusion

<One or two sentences explaining why the existing documentation remains complete and accurate. If a documentation PR already exists, link it and explain that no duplicate was created.>
```
