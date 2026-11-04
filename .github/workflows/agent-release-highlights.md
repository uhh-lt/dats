---
name: Agent Release Highlights
emoji: ✨
description: Add end-user friendly highlights above the generated changelog of a release
intent: Show every DATS user the important changes of a release in the What's New dialog, while keeping the complete list of pull requests below.
on:
  workflow_dispatch:
    inputs:
      tag:
        description: Release tag to add highlights to, e.g. v1.13.0
        required: true
        type: string
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
  group: agent-release-highlights-${{ github.event.inputs.tag }}
  cancel-in-progress: true
  job-discriminator: ${{ github.run_id }}
checkout:
  - ref: refs/tags/${{ needs.prepare.outputs.tag }}
    fetch-depth: 1
tools:
  github:
    mode: gh-proxy
    toolsets: [repos, issues, pull_requests]
  bash: [cat, find, grep, head, ls, sed, tail, wc]
  edit: false
safe-outputs:
  report-failure-as-issue: ["!engine_driver_failure"]
  needs: [prepare]
  threat-detection: {}
  update-release:
    max: 1
    footer: false
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
      contents: read
    outputs:
      tag: ${{ steps.validate.outputs.tag }}
    steps:
      - id: validate
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAG: ${{ github.event.inputs.tag }}
        run: |
          if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "Invalid release tag: $TAG"
            exit 1
          fi
          gh release view "$TAG" --repo "$GITHUB_REPOSITORY" --json tagName > /dev/null
          echo "tag=$TAG" >> "$GITHUB_OUTPUT"
---

# Release Highlights

Add a short, end-user friendly highlights section to the description of release `${{ needs.prepare.outputs.tag }}` in `${{ github.repository }}`. DATS shows this description to every user in its What's New dialog, so the highlights must be understandable for researchers who never read a pull request.

## Rules

- Process only this release. The checkout is its code and documentation.
- Change nothing but the release description. Write to GitHub only through `update-release`, and call it at most once.
- Never change, shorten or reorder the generated changelog of the release; only add the highlights above it.
- Never invent features: every highlight must be backed by a pull request of this release.
- If the release cannot be updated safely, call `noop` with a short reason and stop.

## Steps

1. Read release `${{ needs.prepare.outputs.tag }}` with the GitHub repository tools and take its body.
2. Find the generated changelog: everything after the line `<!-- /dats-release-highlights -->`, or the whole body if that line is missing.
3. If the changelog lists no pull requests, call `noop` with a short reason and stop.
4. For every pull request in the changelog, read its title and body and its `## 📝 Pull Request Overview` comment, when present. Read the diff only when these do not explain the user-visible effect.
5. Classify each pull request:
   - **User-facing:** new features, changed behavior in the UI, renamed pages or concepts, and fixes users notice.
   - **Internal:** refactors, tests, CI, agent instructions and skills, developer tooling and administrator tooling. Leave these to the changelog; mention them at most in one closing bullet.
6. Find the user documentation of each user-facing change in `docs/feature-guides/` and `docs/workflows/` to use its feature names and to link it. A page `docs/<path>.md` is published at `https://dats.science/<path>/`, a page `docs/<path>/index.md` at `https://dats.science/<path>/`; anchors are the lowercased headings with spaces replaced by `-`. Link only pages and headings that exist in the checkout.
7. Write the highlights using the template below.
8. Re-read the highlights and verify every claim against the pull requests and every link against the checkout.
9. Call `update-release` with tag `${{ needs.prepare.outputs.tag }}`, operation `replace`, and as body the highlights followed directly by the unchanged changelog from step 2.

## Templates

- Write 3–6 highlights for the most important user-facing changes, most important first. Merge stacked pull requests of one feature (e.g. `[1/3]`, `[2/3]`) into one highlight.
- Give each highlight an emoji and a bold title that names the benefit, then 1–3 plain sentences on what users can do now, then a `[Learn more](...)` link when documentation exists.
- Mention renamed pages or concepts with their old name, so users find them again.
- Close with a `🛠️ Fixes and under the hood` highlight with 2–4 short bullets: user-noticeable fixes, and one bullet for the internal work.
- Use the vocabulary of the documentation (project, document, code, annotation, memo, ...), no implementation terms (DTO, CRUD, endpoint, ORM, slice, ...), no pull request numbers and no author names.

```markdown
<!-- dats-release-highlights -->

## ✨ Highlights

**<emoji> <benefit-oriented title>**
<1–3 sentences on what users can do now.> [Learn more](https://dats.science/<path>/)

**🛠️ Fixes and under the hood**

- <user-noticeable fix>
- <one bullet summarizing the internal work>

---

<!-- /dats-release-highlights -->
```
