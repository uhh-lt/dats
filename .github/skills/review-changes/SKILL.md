---
name: review-changes
description: Review the changes of a DATS branch, PR or working tree against AGENTS.md and the .github/instructions files with independent reviewer subagents (one for backend, one for frontend) and a verifier subagent, then present the verified findings and discuss with the user what to fix. Review only, no edits.
argument-hint: "Optional: a base ref (default main), a branch, a PR number, or paths to limit the review to"
disable-model-invocation: true
---

# Review Changes

Review a change against the rules this repository wrote down for itself and for correctness, then discuss the result with the user.

You are the coordinator: you work out the scope, brief fresh reviewer subagents, have their findings checked by a verifier subagent, and present the verified result. You do not review the code yourself. A reviewer that knows why the author did something tends to agree with it, so the reviewers see only the code and the rules. A reviewer checking its own findings tends to confirm them, so a separate verifier checks them against the code.

<rules>
- Review only: no edits, commits, branch switches or stashing until the user decides what to address.
- Do not pass your own reasoning about the change to the subagents. They get the scope, the commit messages and, for a PR, its description. Nothing from this conversation.
- Do not run tests, and do not let the subagents run them: parallel runs reset the same test database.
</rules>

## Workflow

### 1. Scope

Run from the repository root, with the arguments that match the user's:

```bash
python3 .github/skills/review-changes/scripts/review_scope.py [--base <ref>] [--head <branch> | --pr <n>] [paths ...]
```

Without arguments it reviews the current branch since `main`, incl. uncommitted and untracked files. `--pr` fetches the PR and its base branch without checking anything out. Paths limit the review to files below them.

It prints the merge base, the commits, the PR description, one section per stack (the instruction files to read, the changed files and the workflow hints for them) and the generated and lock files it leaves out. The hints are heuristics for the AGENTS.md workflows, leads for the reviewers rather than findings. If no reviewable files are left, tell the user and stop.

### 2. Review

Start one reviewer per stack section, all at once, as general-purpose subagents with read and shell access. "Other" goes to the backend reviewer, or to the frontend reviewer if there is no backend section; if only "Other" changed, it gets a reviewer of its own. Give each this brief:

```
Review part of a DATS change. Read .github/skills/review-changes/reviewer.md first and follow it.

Merge base: <sha>   Head: <working tree | ref>
Diff command: <from the scope output>
Commits:
<commit list>
PR description: <only for a PR, verbatim>

<the scope output's section(s) for this reviewer, verbatim>
```

### 3. Verify

When all reviewers have returned and reported findings, start one verifier subagent (general-purpose, read and shell access):

```
Verify the findings of a review of a DATS change. Read .github/skills/review-changes/verifier.md first and follow it.

Merge base: <sha>   Head: <working tree | ref>
Diff command: <from the scope output>

Findings:
<the Findings sections of all reviewers, verbatim, nothing else>
```

### 4. Present

Merge the verdicts into one report. Number the findings R1, R2, ... so you and the user can refer to them, and drop empty sections:

```md
## Review: <branch or PR> vs <base> · <n> files, +<a> −<d>

<One or two sentences: overall state and the most important point.>

### Blockers

**R1 · `path/to/file.py:42` · <short title>** <(downgraded by the verifier from <severity>)>
<What is wrong and the concrete consequence.>
Basis: <instruction file › section> | correctness | judgement
Fix: <the suggested change, in one or two sentences>

### Should fix

### Nits

### Questions

### Instruction gaps

<Candidates for the write-instructions skill.>

### Hotspot candidates

<From confirmed or downgraded findings only: the proposed line for hotspots.md, with the R number.>

### Coverage

- Reviewed: <files and instruction files per reviewer>
- Not covered: <e.g. generated files, behavior at runtime>
- Suggested tests: <tests worth running before merging>
- Rejected by verification: <one line each: the claim and why, so the user can overrule the verifier>
```

### 5. Discuss

Ask the user which findings to address, then fix them in this session as usual.

Hotspot candidates are how the review learns: `hotspots.md` lists the DATS-specific failure classes every reviewer checks. Add a candidate only when the user agrees. Keep each entry one line and general (a class of failure across modules, not this one bug), extend an existing entry rather than adding a near-duplicate, and leave rules for a single file kind to the instruction files. The edit lands like any other change, in its own commit.
