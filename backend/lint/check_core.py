#!/usr/bin/env python3
"""
check_core.py

This script enforces multiple rules for files in the 'core' folder:
1. No file in 'core' may import anything from 'modules'.
(More rules can be added in the future.)
"""

import os
import re
import sys
from pathlib import Path


def find_core_files(root):
    core_dir = os.path.join(root, "core")
    for dirpath, _, filenames in os.walk(core_dir):
        for filename in filenames:
            if filename.endswith(".py"):
                yield os.path.join(dirpath, filename)


def check_no_modules_import(file_path):
    violations = []
    with open(file_path, encoding="utf-8") as f:
        lines = f.readlines()
    for i, line in enumerate(lines, 1):
        if re.search(r"^(from|import) +modules[. ]", line):
            violations.append((i, line.strip()))
    if violations:
        print(f"Violation in {file_path}: imports from modules:")
        for lineno, code in violations:
            print(f"  Line {lineno}: {code}")
        return False
    return True


def main():
    root = Path(__file__).parent.parent / "src"
    all_ok = True
    for file in find_core_files(root):
        ok = True
        ok &= check_no_modules_import(file)
        # (Add more checks here as needed)
        if not ok:
            all_ok = False
    if not all_ok:
        sys.exit(1)
    print("All core checks passed.")


if __name__ == "__main__":
    main()
