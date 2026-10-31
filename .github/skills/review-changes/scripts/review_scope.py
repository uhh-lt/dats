"""Collect the scope of a review: changed files, matching instruction files and workflow hints.

Usage (from the repository root):
    python3 .github/skills/review-changes/scripts/review_scope.py [--base main] [--head REF | --pr N] [paths ...]

Without --head, the review covers everything since the merge base with --base:
commits, staged and unstaged changes and untracked files.
With --head, it covers the commits of that ref since the merge base.
With --pr, it fetches the PR and its base branch (no checkout) and reviews the PR's commits.
Paths limit the review to files below them.

Stdlib only (plus the gh CLI for --pr), so it runs without the backend or frontend dependencies installed.
"""

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

INSTRUCTIONS_DIR = Path(".github/instructions")
MIGRATIONS_DIR = "backend/src/migrations/alembic/versions/"
OPENAPI_SPEC = "frontend/src/openapi.json"
# openapi-typescript-codegen output, and datsEvents.ts written by frontend/bin/updateAPI.js
GENERATED_HEADERS = ("generated using openapi-typescript-codegen", "GENERATED FILE")
DEPENDENCY_FILES = {
    "backend/pyproject.toml",
    "backend/uv.lock",
    "frontend/package.json",
    "frontend/package-lock.json",
    "ray/pyproject.toml",
    "ray/uv.lock",
}


@dataclass
class ChangedFile:
    path: str
    status: str  # A, M, D, R (renamed), ? (untracked)
    added: int = 0
    deleted: int = 0
    old_path: str | None = None
    instructions: list[str] = field(default_factory=list)


def git(*args: str) -> str:
    result = subprocess.run(["git", *args], capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout


def fetch_pr(number: int) -> tuple[str, str, dict[str, str]]:
    """Fetch a PR and its base branch without checking anything out. Returns base ref, head sha and PR info."""
    result = subprocess.run(
        ["gh", "pr", "view", str(number), "--json", "title,body,baseRefName"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        sys.exit(f"gh pr view {number} failed: {result.stderr.strip()}")
    info = json.loads(result.stdout)
    git("fetch", "--quiet", "origin", info["baseRefName"])
    git("fetch", "--quiet", "origin", f"pull/{number}/head")
    return f"origin/{info['baseRefName']}", git("rev-parse", "FETCH_HEAD").strip(), info


def glob_to_regex(glob: str) -> re.Pattern[str]:
    """Translate a VS Code style glob (**, *, ?) into a regex over repo-relative paths."""
    regex = ""
    i = 0
    while i < len(glob):
        if glob.startswith("**/", i):
            regex += "(?:.*/)?"
            i += 3
        elif glob.startswith("**", i):
            regex += ".*"
            i += 2
        elif glob[i] == "*":
            regex += "[^/]*"
            i += 1
        elif glob[i] == "?":
            regex += "[^/]"
            i += 1
        else:
            regex += re.escape(glob[i])
            i += 1
    return re.compile(regex + r"\Z")


def read_instruction_globs() -> dict[str, list[re.Pattern[str]]]:
    """Map each instruction file to the globs of its `paths` frontmatter list."""
    globs: dict[str, list[re.Pattern[str]]] = {}
    for file in sorted(INSTRUCTIONS_DIR.glob("*.instructions.md")):
        lines = file.read_text().splitlines()
        if not lines or lines[0] != "---":
            continue
        in_paths = False
        patterns: list[re.Pattern[str]] = []
        for line in lines[1:]:
            if line == "---":
                break
            if line.startswith("paths:"):
                in_paths = True
                continue
            if in_paths and line.lstrip().startswith("- "):
                patterns.append(
                    glob_to_regex(line.split("- ", 1)[1].strip().strip("\"'"))
                )
                continue
            in_paths = False
        globs[str(file)] = patterns
    return globs


def collect_changes(merge_base: str, head: str | None) -> list[ChangedFile]:
    diff_refs = [merge_base, head] if head else [merge_base]
    files: dict[str, ChangedFile] = {}
    for line in git("diff", "--name-status", "-M", *diff_refs).splitlines():
        parts = line.split("\t")
        status = parts[0][0]
        if status == "R":
            files[parts[2]] = ChangedFile(path=parts[2], status="R", old_path=parts[1])
        else:
            files[parts[1]] = ChangedFile(path=parts[1], status=status)
    for line in git("diff", "--numstat", "-M", *diff_refs).splitlines():
        added, deleted, path = line.split("\t", 2)
        if " => " in path:  # renames: "dir/{old => new}/file" or "old => new"
            path = (
                re.sub(r"\{[^{}]* => ([^{}]*)\}", r"\1", path)
                .split(" => ")[-1]
                .replace("//", "/")
            )
        if path in files and added != "-":
            files[path].added, files[path].deleted = int(added), int(deleted)
    if not head:
        for path in git("ls-files", "--others", "--exclude-standard").splitlines():
            try:
                added = len(Path(path).read_text().splitlines())
            except (UnicodeDecodeError, OSError):
                added = 0
            files[path] = ChangedFile(path=path, status="?", added=added)
    return sorted(files.values(), key=lambda f: f.path)


def is_generated(file: ChangedFile, head: str | None) -> bool:
    if file.path == OPENAPI_SPEC or file.path.endswith(".gen.ts"):
        return True
    if file.status == "D" or not file.path.startswith("frontend/src/"):
        return False
    try:
        if head:
            header = "\n".join(git("show", f"{head}:{file.path}").split("\n", 3)[:3])
        else:
            with open(file.path) as handle:
                header = "".join(handle.readline() for _ in range(3))
    except (UnicodeDecodeError, OSError):
        return False
    return any(marker in header for marker in GENERATED_HEADERS)


def stack_of(path: str) -> str:
    for stack in ("backend", "frontend"):
        if path.startswith(f"{stack}/"):
            return stack
    return "other"


def workflow_hints(
    files: list[ChangedFile], generated: list[ChangedFile]
) -> dict[str, list[str]]:
    """Heuristic checks of the AGENTS.md workflows, by stack. Each one is a lead for a reviewer, not a finding."""
    paths = {f.path for f in files if f.status != "D"} | {f.path for f in generated}
    hints: dict[str, list[str]] = {"backend": [], "frontend": [], "other": []}

    orms = sorted(p for p in paths if re.search(r"^backend/src/.*_orm\.py$", p))
    migrations = sorted(p for p in paths if p.startswith(MIGRATIONS_DIR))
    if orms and not migrations:
        hints["backend"].append(
            f"ORM files changed ({', '.join(orms)}) but no migration was added in {MIGRATIONS_DIR}. "
            "Check whether the change alters the schema."
        )
    if migrations:
        hints["backend"].append(
            f"Migrations added or changed ({', '.join(migrations)}). Check that they were generated with "
            "`just alembic revision`, match the ORM changes, and migrate existing production data where needed."
        )

    api_sources = sorted(
        p for p in paths if re.search(r"^backend/src/.*_(dto|endpoint)\.py$", p)
    )
    if api_sources and OPENAPI_SPEC not in paths:
        hints["backend"].append(
            f"DTOs or endpoints changed ({', '.join(api_sources)}) but {OPENAPI_SPEC} did not. "
            "If the API surface changed, the frontend client was not regenerated (`just update-api`)."
        )
    generated_client = sorted(
        f.path
        for f in generated
        if f.path != OPENAPI_SPEC and not f.path.endswith(".gen.ts")
    )
    if generated_client and OPENAPI_SPEC not in paths:
        hints["frontend"].append(
            f"Generated client files changed without {OPENAPI_SPEC} ({', '.join(generated_client)}). "
            "They may have been edited by hand."
        )

    backend_code = [
        p
        for p in paths
        if p.startswith("backend/src/")
        and p.endswith(".py")
        and not p.startswith(MIGRATIONS_DIR)
    ]
    backend_tests = [p for p in paths if p.startswith("backend/test/")]
    if backend_code and not backend_tests:
        hints["backend"].append(
            "Backend code changed but no file in backend/test/ did. Check whether the changed behavior needs a test."
        )

    for dependency in sorted(paths & DEPENDENCY_FILES):
        hints[stack_of(dependency)].append(
            f"Dependency file changed ({dependency}). AGENTS.md forbids new dependencies; "
            "check what was added or upgraded."
        )

    entry_points = sorted(
        p for p in paths if re.search(r"^backend/src/(main|worker|setup)\.py$", p)
    )
    if entry_points:
        hints["backend"].append(
            f"Entry points changed ({', '.join(entry_points)}). Startup changes belong in backend/src/bootstrap.py, "
            "not in an entry point."
        )

    if any(re.search(r"_endpoint\.py$", p) for p in paths):
        hints["backend"].append(
            "Endpoints changed. `lint/check_endpoints.py` does not run in pre-commit; run it from backend/ "
            "(`uv run python lint/check_endpoints.py`) and report only violations in the changed files."
        )
    if any(re.search(r"^backend/src/repos/.*_repo\.py$", p) for p in paths):
        hints["backend"].append(
            "Repos changed. `lint/check_repos.py` does not run in pre-commit; run it from backend/ "
            "(`uv run python lint/check_repos.py`) and report only violations in the changed files."
        )

    instruction_changes = sorted(
        p for p in paths if p.startswith(".github/instructions/") or p == "AGENTS.md"
    )
    if instruction_changes:
        hints["other"].append(
            f"Instruction files changed ({', '.join(instruction_changes)}). Review the code against the new "
            "version and check that `applyTo` and `paths` stay in sync."
        )
    return hints


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--base", default="main", help="Ref to compare against (default: main)"
    )
    parser.add_argument("--head", help="Review this ref instead of the working tree")
    parser.add_argument("--pr", type=int, help="Review this PR against its base branch")
    parser.add_argument("paths", nargs="*", help="Only review files below these paths")
    args = parser.parse_args()

    pr: dict[str, str] | None = None
    if args.pr:
        if args.head:
            sys.exit("--pr and --head exclude each other")
        args.base, args.head, pr = fetch_pr(args.pr)

    merge_base = git("merge-base", args.base, args.head or "HEAD").strip()
    if pr:
        head_label = f"PR #{args.pr} `{args.head[:9]}`: {pr['title']}"
    else:
        head_label = (
            args.head
            or f"working tree of {git('rev-parse', '--abbrev-ref', 'HEAD').strip()}"
        )
    files = collect_changes(merge_base, args.head)
    if args.paths:
        prefixes = [p.rstrip("/") for p in args.paths]
        files = [
            f
            for f in files
            if any(f.path == p or f.path.startswith(f"{p}/") for p in prefixes)
        ]

    generated = [f for f in files if is_generated(f, args.head)]
    dependency_locks = [
        f for f in files if f.path.endswith((".lock", "package-lock.json"))
    ]
    skipped = {f.path for f in generated + dependency_locks}
    reviewable = [f for f in files if f.path not in skipped]

    globs = read_instruction_globs()
    for file in reviewable:
        file.instructions = [
            name
            for name, patterns in globs.items()
            if any(p.match(file.path) for p in patterns)
        ]

    commits = git(
        "log", "--format=- %h %s", f"{merge_base}..{args.head or 'HEAD'}"
    ).strip()

    print("# Review scope\n")
    print(f"- Base: `{args.base}` (merge base `{merge_base[:9]}`)")
    print(f"- Head: {head_label}")
    print(
        f"- Diff: `git diff {merge_base[:9]}{' ' + args.head if args.head else ''} -- <file>`"
        + ("" if args.head else " (untracked files: read them whole)")
    )
    total_added = sum(f.added for f in reviewable)
    total_deleted = sum(f.deleted for f in reviewable)
    print(
        f"- Size: {len(reviewable)} files to review, +{total_added} −{total_deleted} lines\n"
    )

    if not files:
        print("No changes found.")
        return

    print("## Commits\n")
    print(commits or "- (none, only uncommitted changes)")
    print()

    if pr:
        print("## PR description\n")
        print(pr["body"].strip() or "(empty)")
        print()

    hints = workflow_hints(files, generated)
    for stack in ("backend", "frontend", "other"):
        stack_files = [f for f in reviewable if stack_of(f.path) == stack]
        if not stack_files:
            continue
        added = sum(f.added for f in stack_files)
        deleted = sum(f.deleted for f in stack_files)
        print(
            f"## {stack.capitalize()} ({len(stack_files)} files, +{added} −{deleted})\n"
        )
        instructions = sorted({name for f in stack_files for name in f.instructions})
        print(
            "Instruction files to read: "
            + (", ".join(f"`{i}`" for i in instructions) or "none (AGENTS.md only)")
        )
        print()
        for f in stack_files:
            rename = f" (from `{f.old_path}`)" if f.old_path else ""
            applies = (
                ", ".join(
                    Path(i).name.removesuffix(".instructions.md")
                    for i in f.instructions
                )
                or "-"
            )
            print(
                f"- [{f.status}] `{f.path}`{rename} +{f.added} −{f.deleted} · {applies}"
            )
        print("\nWorkflow hints:\n")
        print("\n".join(f"- {h}" for h in hints.pop(stack)) or "- none")
        print()

    if skipped:
        print("## Not reviewed (generated or lock files)\n")
        for f in generated + dependency_locks:
            print(f"- [{f.status}] `{f.path}` +{f.added} −{f.deleted}")
        print()

    # hints of a stack without reviewable files, e.g. only generated client files changed
    leftover = [h for stack_hints in hints.values() for h in stack_hints]
    if leftover:
        print("## Workflow hints without a stack section\n")
        print("\n".join(f"- {h}" for h in leftover))


if __name__ == "__main__":
    main()
