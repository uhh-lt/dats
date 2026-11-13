#!/usr/bin/env python3
"""
check_core.py

This script enforces the layering of 'core' and 'systems' on 'modules':
1. No file in 'core' may import anything from 'modules' at module level (type
   hints under `if TYPE_CHECKING:` are allowed).
2. No file in 'systems' may import anything from 'modules', also not inside a
   function or under `if TYPE_CHECKING:`, except the imports of
   `ALLOWED_MODULE_IMPORTS`.
(More rules can be added in the future.)
"""

import os
import re
import sys
from pathlib import Path

SRC = Path(__file__).parent.parent / "src"

# folder -> pattern of a forbidden import line
FORBIDDEN_IMPORTS = {
    "core": re.compile(r"^(from|import) +modules[. ]"),
    "systems": re.compile(r"^\s*(from|import) +modules[. ]"),
}


# Temporary exemptions: file (relative to src) -> the module package it may
# import. The feature system enables, completes and disables the features of
# a project, which the step planning of document processing carries out, and
# derives their status from the planned steps.
# TODO: remove once document processing moves to core, see uhh-lt/dats#900
# ("Move document processing to core").
ALLOWED_MODULE_IMPORTS = {
    "systems/feature_system/feature_dto.py": "modules.doc_processing",
    "systems/feature_system/feature_endpoint.py": "modules.doc_processing",
    "systems/feature_system/feature_service.py": "modules.doc_processing",
    "systems/artefact_system/step_run.py": "modules.doc_processing",  # until B3
}


def _is_allowed(file_path, line):
    """Whether the import line is one of `ALLOWED_MODULE_IMPORTS`."""
    allowed = ALLOWED_MODULE_IMPORTS.get(Path(file_path).relative_to(SRC).as_posix())
    if allowed is None:
        return False
    match = re.match(r"^\s*(?:from|import) +([\w.]+)", line)
    return match is not None and (
        match.group(1) == allowed or match.group(1).startswith(allowed + ".")
    )


def find_files(root, folder):
    for dirpath, _, filenames in os.walk(os.path.join(root, folder)):
        for filename in filenames:
            if filename.endswith(".py"):
                yield os.path.join(dirpath, filename)


def check_no_modules_import(file_path, pattern):
    violations = []
    with open(file_path, encoding="utf-8") as f:
        lines = f.readlines()
    for i, line in enumerate(lines, 1):
        if pattern.search(line) and not _is_allowed(file_path, line):
            violations.append((i, line.strip()))
    if violations:
        print(f"Violation in {file_path}: imports from modules:")
        for lineno, code in violations:
            print(f"  Line {lineno}: {code}")
        return False
    return True


def main():
    root = SRC
    all_ok = True
    for folder, pattern in FORBIDDEN_IMPORTS.items():
        for file in find_files(root, folder):
            ok = True
            ok &= check_no_modules_import(file, pattern)
            # (Add more checks here as needed)
            if not ok:
                all_ok = False
    if not all_ok:
        sys.exit(1)
    print("All core and systems layering checks passed.")


if __name__ == "__main__":
    main()
