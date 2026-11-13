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
(More rules can be added in the future.)
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


def main(root=SRC):
    all_ok = True
    for folder, (package, pattern) in FORBIDDEN_IMPORTS.items():
        for file in find_files(root, folder):
            ok = True
            ok &= check_no_forbidden_import(file, package, pattern)
            # (Add more checks here as needed)
            if not ok:
                all_ok = False
    if not all_ok:
        sys.exit(1)
    print("All core and systems layering checks passed.")


if __name__ == "__main__":
    main()
