---
name: review-changes
description: Review the changes of a DATS branch, PR or working tree against AGENTS.md and the .github/instructions files with independent reviewer subagents (one for backend, one for frontend) and a verifier subagent, then present the verified findings and discuss with the user what to fix. Review only, no edits.
argument-hint: "Optional: a base ref (default main), a branch, a PR number, or paths to limit the review to"
disable-model-invocation: true
---

# Review Changes

Review a change against the rules this repository wrote down for itself and for correctness, then discuss the result with the user.

You are the coordinator. You work out the scope, brief fresh reviewer subagents, have their findings verified by another subagent, and present the verified result. You do not review the code yourself, and you do not fix anything.

Why this split:

- **Fresh reviewers.** You may have written or discussed the change in this conversation. A reviewer that knows why the author did something tends to agree with it. A subagent that only sees the code and the rules reviews it on its own terms.
- **One reviewer per stack.** The backend and frontend have their own instruction files. A reviewer that reads only the rules for the files it reviews stays focused.
- **A separate verifier.** Reviewers produce claims, and some are wrong: the rule says something else, the bug is handled two lines further down, or a matter of taste is presented as a violation. A reviewer checking its own findings tends to confirm them, so a second agent checks them against the code.

<rules>
- Review only. Neither you nor the subagents edit files, commit, switch branches, stash or run formatters or `just lint` (it runs `ruff --fix`).
- Do not pass your own reasoning about the change to the subagents. They get the scope, the commit messages and, for a PR, its description. Nothing from this conversation.
- Do not run tests: two reviewers would reset the same test database at the same time. Reviewers name the tests worth running instead.
- After presenting the review, discuss it with the user. Fix nothing until the user decides what to address.
</rules>

## Workflow

### 1. Scope

Determine what to review from the arguments:

| Argument           | Script arguments                                                             |
| ------------------ | ---------------------------------------------------------------------------- |
| none               | none: the current branch since `main`, incl. uncommitted and untracked files |
| a base ref         | `--base <ref>`                                                               |
| a branch to review | `--head <branch>`                                                            |
| a PR number        | `--base origin/<baseRefName> --head <sha>`, see below                        |
| paths              | the paths, as positional arguments, to limit the review to files below them  |

For a PR, read its title, description and branches with `gh pr view <n> --json title,body,baseRefName`, then fetch both sides without checking anything out: `git fetch origin <baseRefName>`, then `git fetch origin pull/<n>/head` and take `<sha>` from `git rev-parse FETCH_HEAD`.

Then run from the repository root:

```bash
python3 .github/skills/review-changes/scripts/review_scope.py [--base <ref>] [--head <ref>] [paths ...]
```

It prints the merge base, the commits, the changed files grouped by stack with the instruction files whose `paths` globs match each file, the generated and lock files it leaves out, and workflow hints. The hints are heuristics for the AGENTS.md workflows (migration missing, API client not regenerated, no tests, new dependencies, ...). They are leads for the reviewers, not findings.

If no reviewable files are left, tell the user and stop.

### 2. Plan the reviewers

- One reviewer for `backend/**` and one for `frontend/**`, each only if that stack has changes.
- Files in "Other" (`docs/`, `ray/`, `docker/`, `tools/`, `.github/`, root files) go to the backend reviewer, or to the frontend reviewer if there is no backend change. If only "Other" changed, use one reviewer.

### 3. Review

Start all reviewers at once, in parallel, as general-purpose subagents with read and shell access (they need `git`). Give each one this brief, filled in:

```
Review part of a DATS change. Read .github/skills/review-changes/reviewer.md first and follow it.

Stack: <backend | frontend | ...>
Merge base: <sha>   Head: <working tree | ref>
Diff command: <from the scope output>
Commits:
<commit list>
PR description: <only for a PR, verbatim>

Files to review:
<the file lines of this reviewer's part, verbatim from the scope output>

Instruction files to read: AGENTS.md, <the files listed for this part>

Workflow hints for this part:
<the hints that concern these files, verbatim, or "none">
```

### 4. Verify

When all reviewers have returned, collect their findings. If there are none, skip to step 5.

Start one verifier subagent (general-purpose, read and shell access) with this brief:

```
Verify the findings of a review of a DATS change. Read .github/skills/review-changes/verifier.md first and follow it.

Merge base: <sha>   Head: <working tree | ref>
Diff command: <from the scope output>

Findings:
<all findings of all reviewers, verbatim, with their IDs>
```

Pass only the findings, not the reviewers' coverage notes or reasoning beyond them, so the verifier judges each claim from the code.

### 5. Present

Merge the verifier's verdicts into one report. Number the findings R1, R2, ... in report order, so you and the user can refer to them. Use this structure and drop empty sections:

```md
## Review: <branch or PR> vs <base> · <n> files, +<a> −<d>

<One or two sentences: overall state and the most important point.>

### Blockers

**R1 · `path/to/file.py:42` · <short title>**
<What is wrong and the concrete consequence.>
Basis: <instruction file › section> | correctness | judgement
Fix: <the suggested change, in one or two sentences>

### Should fix

### Nits

### Questions

<Things the reviewers could not decide without knowing the intent.>

### Instruction gaps

<Patterns the change introduces that no instruction file covers, or rules that contradict the codebase. Candidates for the write-instructions skill.>

### Coverage

- Reviewed: <files and instruction files per reviewer>
- Not covered: <what nobody checked, e.g. generated files, behavior at runtime>
- Suggested tests: <tests worth running before merging>
- Rejected by verification: <count, one line each: the claim and why it was rejected>
```

Show downgraded findings under their new severity, with a note that the verifier downgraded them. List the rejected ones under Coverage instead of dropping them silently, so the user can overrule the verifier.

Then ask the user which findings to address, and discuss from there. When the user decides, fix them in this session as usual. The review itself stays read-only.
