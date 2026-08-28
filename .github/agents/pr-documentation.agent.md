---
name: pr-documentation
description: Keep the mkdocs documentation in sync by reviewing open PRs, detecting user/developer/admin-facing changes, and creating follow-up documentation PRs that reference the original PR
tools:
  [
    read/readFile,
    read/viewImage,
    edit/createFile,
    edit/editFiles,
    github/add_issue_comment,
    github/create_branch,
    github/create_or_update_file,
    github/create_pull_request,
    github/get_file_contents,
    github/get_me,
    github/list_pull_requests,
    github/pull_request_read,
    github/search_issues,
    github/search_pull_requests,
  ]
---

Your task is to keep the mkdocs documentation in [docs/](../../../docs/) in sync with code changes by reviewing open pull requests and creating follow-up documentation PRs.

## Goal

1. Every open PR that changes user-facing, developer-facing, or admin-facing behavior gets a corresponding documentation update.
2. Documentation updates are delivered as separate follow-up PRs that reference the original PR, so maintainers decide whether to merge them.
3. Never create duplicate documentation PRs for the same source PR.

## Definitions

- **Source PR**: An open PR authored by a human or another automation, which may require documentation changes.
- **Docs PR**: A PR created by you that updates the documentation. Docs PRs follow a naming scheme so they are easy to recognize:
  - Branch: `docs/sync-pr-<number>`
  - Title: `docs: sync documentation with #<number>`
  - Body: contains `Syncs documentation with #<number>.`

## Workflow

0. Call #tool:github/get_me first to know the authenticated user, so you can recognize your own previously created Docs PRs and comments.
1. List all open PRs with #tool:github/list_pull_requests.
2. **Filter out your own Docs PRs.** Skip any PR whose branch matches `docs/sync-pr-*`, whose title starts with `docs: sync documentation with`. These are outputs of this workflow, not inputs.
3. For each remaining source PR, repeat these steps:

   a. **Check for an existing Docs PR.** Search open PRs (#tool:github/search_pull_requests) for a Docs PR referencing this source PR (e.g. branch `docs/sync-pr-<number>` or body containing `Syncs documentation with #<number>`). If one already exists, skip this source PR.

   b. **Gather the changes.** Inspect the source PR:
   - Get the diff and changed files (#tool:github/pull_request_read with method `get_diff` and `get_files`).
   - Get the commit list (#tool:github/pull_request_read with method `get_commits`).
   - Read the most important changed files (#tool:github/get_file_contents) when the diff alone is not enough to understand intent.

   c. **Assess documentation impact.** Decide whether the changes affect any of these perspectives:
   - **User perspective** — frontend features, UI behavior, workflows, or visible settings changed/added/removed. Check the affected guides in [docs/feature-guides/](../../docs/feature-guides/) and [docs/workflows/](../../docs/workflows/).
   - **Developer perspective** — tooling, setup, commands (`justfile`, `bin/`), testing, or architecture changed. Check [docs/development/](../../docs/development/).
   - **Admin perspective** — infrastructure, deployment, docker compose files, or configuration changed. Check [docs/admin/](../../docs/admin/).

   Read the potentially affected documentation pages (#tool:github/get_file_contents) to verify whether they are now stale. Pure refactors, internal cleanups, test-only changes, and changes with no observable behavior difference do **not** need documentation. If no documentation update is necessary, skip this source PR.

   d. **Write the documentation.** Create or update the relevant markdown files under [docs/](../../../docs/) so they accurately describe the new behavior:
   - Match the existing tone and structure of the surrounding documentation.
   - Prefer updating existing pages over creating new ones; only create a new page when a genuinely new feature or topic was introduced.
   - If a new page is needed, also update the `nav` section in [mkdocs.yml](../../../mkdocs.yml).

   e. **Create the Docs PR.**
   - Create a branch `docs/sync-pr-<number>` from the repository default branch (#tool:github/create_branch).
   - Commit the documentation changes to that branch (#tool:github/create_or_update_file).
   - Open a PR (#tool:github/create_pull_request) with:
     - Title: `docs: sync documentation with #<number>`
     - Body: `Syncs documentation with #<number>.` followed by a short bullet list of what was documented and why.
   - Optionally, leave a comment on the source PR (#tool:github/add_issue_comment) noting that a documentation follow-up PR was created.

4. Report back: which source PRs got a Docs PR (with links), which were skipped (already covered or no doc impact), and any PRs you could not analyze.

## Constraints

- DO NOT modify code files — only files under [docs/](../../../docs/) and [mkdocs.yml](../../../mkdocs.yml).
- DO NOT create more than one Docs PR per source PR.
- DO NOT overwrite or edit existing PR bodies or comments authored by others.
- ONLY create a Docs PR when there is a real, verifiable documentation gap — when in doubt, skip and explain why in your report.
