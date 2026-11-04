#!/usr/bin/env python3
"""Claude Code hook: give an agent the matching .github/instructions when it edits files.

Native path-scoped rules load on reads, so grep-only exploration, new files, subagents,
compaction and shell edits leave changes without them. Delivered rules are remembered per
agent until the next compaction, so every rule reaches the agent once per context.

- Edit and Write: context added by a passing PreToolUse hook only arrives after the edit, so
  the first edit of each rule is denied once with the rule text as the reason.
- Bash: a command cannot be parsed for the files it writes, so git reports what it changed
  and the rules arrive right after it, with the request to review those changes.
"""

import json
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

RULES_DIR = Path(".github/instructions")


def glob_to_regex(glob: str) -> re.Pattern[str]:
    regex = re.escape(glob)
    regex = (
        regex.replace(r"\*\*/", "(?:.*/)?")
        .replace(r"\*\*", ".*")
        .replace(r"\*", "[^/]*")
    )
    return re.compile(f"^{regex}$")


def split_frontmatter(rule: Path) -> tuple[str, str]:
    _, frontmatter, body = rule.read_text().split("---\n", 2)
    return frontmatter, body.strip()


def rule_applies(frontmatter: str, relative_paths: list[str]) -> bool:
    globs = re.findall(r'^\s+- "(.+)"$', frontmatter, re.MULTILINE)
    regexes = [glob_to_regex(glob) for glob in globs]
    return any(regex.match(path) for regex in regexes for path in relative_paths)


def find_checkout(path: Path) -> Path | None:
    # Walk up from the path, so a worktree gets the rules of its own branch.
    return next((p for p in (path, *path.parents) if (p / RULES_DIR).is_dir()), None)


def state_file(payload: dict) -> Path:
    agent = f"{payload['session_id']}-{payload.get('agent_id', 'main')}"
    return Path(tempfile.gettempdir()) / f"dats-instructions-{agent}"


def stamp_file(payload: dict) -> Path:
    command = f"{payload['session_id']}-{payload.get('tool_use_id', 'bash')}"
    return Path(tempfile.gettempdir()) / f"dats-bash-start-{command}"


def clear_delivered(payload: dict) -> None:
    # Compaction hooks carry no agent_id, so any compaction resets all agents of the session.
    prefix = f"dats-instructions-{payload['session_id']}-"
    for state in Path(tempfile.gettempdir()).glob(f"{prefix}*"):
        state.unlink(missing_ok=True)


def read_delivered(state: Path) -> set[str]:
    return set(state.read_text().split()) if state.exists() else set()


def take_pending_rules(
    payload: dict, checkout: Path, relative_paths: list[str]
) -> str | None:
    """Return the undelivered rules of these paths as text and mark them delivered."""
    state = state_file(payload)
    delivered = read_delivered(state)

    pending: dict[str, str] = {}
    for rule in sorted((checkout / RULES_DIR).glob("*.md")):
        frontmatter, body = split_frontmatter(rule)
        if rule.name not in delivered and rule_applies(frontmatter, relative_paths):
            pending[rule.name] = body
    if not pending:
        return None

    state.write_text("\n".join(delivered | pending.keys()))
    return "\n\n".join(f"<{name}>\n{body}\n</{name}>" for name, body in pending.items())


def changed_files(checkout: Path, since: float) -> list[str]:
    status = subprocess.run(
        [
            "git",
            "-c",
            "status.renames=false",
            "status",
            "--porcelain",
            "-z",
            "--untracked-files=all",
        ],
        cwd=checkout,
        capture_output=True,
        text=True,
    ).stdout
    paths = [entry[3:] for entry in status.split("\0") if entry]
    return [
        path
        for path in paths
        if (checkout / path).is_file() and (checkout / path).stat().st_mtime >= since
    ]


def handle_file_tool(payload: dict) -> None:
    file_path = Path(payload["tool_input"]["file_path"])
    checkout = find_checkout(file_path)
    if checkout is None:
        return

    relative_path = file_path.relative_to(checkout).as_posix()
    rules = take_pending_rules(payload, checkout, [relative_path])
    if rules is None:
        return

    reason = (
        f"Not an error: these project rules apply to {relative_path} and were not in your context."
        f" Check your planned change against them, adjust it, then retry.\n\n{rules}"
    )
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": reason,
                }
            }
        )
    )


def handle_after_bash(payload: dict) -> None:
    stamp = stamp_file(payload)
    checkout = find_checkout(Path(payload["cwd"]))
    if not stamp.exists() or checkout is None:
        return

    # One second of slack, because file systems round modification times.
    since = float(stamp.read_text()) - 1
    stamp.unlink()
    changed = changed_files(checkout, since)
    rules = take_pending_rules(payload, checkout, changed)
    if rules is None:
        return

    reason = (
        f"These project rules apply to files this command changed ({', '.join(changed)}) and"
        f" were not in your context. Review your changes against them and fix what does not"
        f" comply before you continue.\n\n{rules}"
    )
    print(json.dumps({"decision": "block", "reason": reason}))


def handle_instructions_loaded(payload: dict) -> None:
    name = Path(payload["file_path"]).name
    if not name.endswith(".instructions.md"):
        return
    state = state_file(payload)
    state.write_text("\n".join(read_delivered(state) | {name}))


def main() -> None:
    payload = json.load(sys.stdin)
    match payload["hook_event_name"], payload.get("tool_name"):
        case "PreToolUse", "Bash":
            stamp_file(payload).write_text(str(time.time()))
        case "PreToolUse", _:
            handle_file_tool(payload)
        case "PostToolUse" | "PostToolUseFailure", _:
            handle_after_bash(payload)
        case "InstructionsLoaded", _:
            handle_instructions_loaded(payload)
        case "SessionStart", _:
            clear_delivered(payload)


if __name__ == "__main__":
    main()
