#!/usr/bin/env python3
"""
check_services.py

This script enforces multiple rules for *_service.py files:
1. Not allowed to import *_endpoint.py files.
(More rules can be added in the future.)
"""

import os
import sys
from pathlib import Path


def find_service_files(root):
    for dirpath, _, filenames in os.walk(root):
        for filename in filenames:
            if filename.endswith("_service.py"):
                yield os.path.join(dirpath, filename)


def check_no_endpoint_imports(service_path):
    violations = []
    with open(service_path, encoding="utf-8") as f:
        lines = f.readlines()
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if (
            stripped.startswith("from ") or stripped.startswith("import ")
        ) and "_endpoint" in stripped:
            violations.append((i, stripped))
    if violations:
        print(f"Violation in {service_path}: imports endpoint files:")
        for lineno, code in violations:
            print(f"  Line {lineno}: {code}")
        return False
    return True


def main():
    root = Path(__file__).parent.parent / "src"
    all_ok = True
    for service in find_service_files(root):
        ok = True
        ok &= check_no_endpoint_imports(service)
        # (Add more checks here as needed)
        if not ok:
            all_ok = False
    if not all_ok:
        sys.exit(1)
    print("All service checks passed.")


if __name__ == "__main__":
    main()
