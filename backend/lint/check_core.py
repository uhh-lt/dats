#!/usr/bin/env python3
"""
check_core.py

This script enforces the layering of 'core' and 'systems':
1. No file in 'core' may import anything from 'modules' at module level (type
   hints under `if TYPE_CHECKING:` are allowed).
2. No file in 'systems' may import anything from 'modules', also not inside a
   function or under `if TYPE_CHECKING:`.
3. No file in 'systems/artefact_system' may import anything from
   'systems.feature_system': the feature system talks to the artefact system,
   never the other way round.
4. No file in 'modules/<a>' may import 'modules.<b>' for another module b, also
   not inside a function or under `if TYPE_CHECKING:`, except the pairs listed
   in MODULE_IMPORT_EXCEPTIONS. An exception that no longer occurs is a
   violation too, so the list only shrinks.
"""

import os
import re
import sys
from pathlib import Path

SRC = Path(__file__).parent.parent / "src"

# folder -> (forbidden package, pattern of a forbidden import line)
FORBIDDEN_IMPORTS = {
    "core": ("modules", re.compile(r"^(from|import) +modules[. ]")),
    "systems": ("modules", re.compile(r"^\s*(from|import) +modules[. ]")),
    "systems/artefact_system": (
        "systems.feature_system",
        re.compile(r"^\s*(from|import) +systems\.feature_system[. ]"),
    ),
}


# (importing module, imported module) -> why it may import it
MODULE_IMPORT_EXCEPTIONS = {
    ("eximport", "whiteboard"): "export/import becomes a system later",
    ("eximport", "timeline_analysis"): "export/import becomes a system later",
    ("eximport", "experiment"): "export/import becomes a system later",
    ("eximport", "concept_over_time_analysis"): "export/import becomes a system later",
    ("eximport", "agreement"): "export/import becomes a system later",
    ("eximport", "llm_assistant"): "export/import becomes a system later",
    (
        "experiment",
        "agreement",
    ): "experiments evaluate with the agreement measures by design",
    ("experiment", "llm_assistant"): "experiments run the LLM assistant by design",
}

MODULE_IMPORT = re.compile(r"^\s*(?:from|import) +modules\.(\w+)")


def find_files(root, folder):
    for dirpath, _, filenames in os.walk(os.path.join(root, folder)):
        for filename in filenames:
            if filename.endswith(".py"):
                yield os.path.join(dirpath, filename)


def check_no_forbidden_import(file_path, package, pattern):
    violations = []
    with open(file_path, encoding="utf-8") as f:
        lines = f.readlines()
    for i, line in enumerate(lines, 1):
        if pattern.search(line):
            violations.append((i, line.strip()))
    if violations:
        print(f"Violation in {file_path}: imports from {package}:")
        for lineno, code in violations:
            print(f"  Line {lineno}: {code}")
        return False
    return True


def check_module_imports(root, exceptions):
    """Rule 4: the imports of another module, outside the exceptions, and the
    exceptions that no longer occur. Returns whether all is fine."""
    modules_dir = os.path.join(root, "modules")
    found = set()
    ok = True
    for file in sorted(find_files(root, "modules")):
        importer = os.path.relpath(file, modules_dir).split(os.sep)[0]
        with open(file, encoding="utf-8") as f:
            lines = f.readlines()
        for i, line in enumerate(lines, 1):
            match = MODULE_IMPORT.search(line)
            if not match or match.group(1) == importer:
                continue
            pair = (importer, match.group(1))
            found.add(pair)
            if pair not in exceptions:
                print(
                    f"Violation in {file}: module '{pair[0]}' imports module "
                    f"'{pair[1]}':\n  Line {i}: {line.strip()}"
                )
                ok = False
    for pair in sorted(set(exceptions) - found):
        print(
            f"Stale exception: module '{pair[0]}' no longer imports module "
            f"'{pair[1]}'; remove it from MODULE_IMPORT_EXCEPTIONS."
        )
        ok = False
    return ok


def main(root=SRC, module_exceptions=MODULE_IMPORT_EXCEPTIONS):
    all_ok = True
    for folder, (package, pattern) in FORBIDDEN_IMPORTS.items():
        for file in find_files(root, folder):
            ok = True
            ok &= check_no_forbidden_import(file, package, pattern)
            # (Add more checks here as needed)
            if not ok:
                all_ok = False
    all_ok &= check_module_imports(root, module_exceptions)
    if not all_ok:
        sys.exit(1)
    print("All core, systems and module layering checks passed.")


if __name__ == "__main__":
    main()
