#!/usr/bin/env python3
"""
check_dtos.py

This script enforces multiple rules for *_dto.py files:
1. Not allowed to import *_service.py files
2. Not allowed to import *_repo.py files
3. Not allowed to import *_orm.py files
4. Not allowed to import *_endpoint.py files
"""

import os
import sys
from pathlib import Path


def find_dto_files(root):
    for dirpath, _, filenames in os.walk(root):
        for filename in filenames:
            if filename.endswith("_dto.py"):
                yield os.path.join(dirpath, filename)


def check_no_service_imports(dto_path):
    violations = []
    with open(dto_path, encoding="utf-8") as f:
        lines = f.readlines()
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if (
            stripped.startswith("from ") or stripped.startswith("import ")
        ) and "_service" in stripped:
            violations.append((i, stripped))
    if violations:
        print(f"Violation in {dto_path}: imports service files:")
        for lineno, code in violations:
            print(f"  Line {lineno}: {code}")
        return False
    return True


def check_no_repo_imports(dto_path):
    violations = []
    with open(dto_path, encoding="utf-8") as f:
        lines = f.readlines()
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if (
            stripped.startswith("from ") or stripped.startswith("import ")
        ) and "_repo" in stripped:
            violations.append((i, stripped))
    if violations:
        print(f"Violation in {dto_path}: imports repo files:")
        for lineno, code in violations:
            print(f"  Line {lineno}: {code}")
        return False
    return True


def check_no_orm_imports(dto_path):
    violations = []
    with open(dto_path, encoding="utf-8") as f:
        lines = f.readlines()
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if (
            stripped.startswith("from ") or stripped.startswith("import ")
        ) and "_orm" in stripped:
            violations.append((i, stripped))
    if violations:
        print(f"Violation in {dto_path}: imports orm files:")
        for lineno, code in violations:
            print(f"  Line {lineno}: {code}")
        return False
    return True


def check_no_endpoint_imports(dto_path):
    violations = []
    with open(dto_path, encoding="utf-8") as f:
        lines = f.readlines()
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if (
            stripped.startswith("from ") or stripped.startswith("import ")
        ) and "_endpoint" in stripped:
            violations.append((i, stripped))
    if violations:
        print(f"Violation in {dto_path}: imports endpoint files:")
        for lineno, code in violations:
            print(f"  Line {lineno}: {code}")
        return False
    return True


def main():
    root = Path(__file__).parent.parent / "src"
    all_ok = True
    for dto in find_dto_files(root):
        ok = True
        ok &= check_no_service_imports(dto)
        ok &= check_no_repo_imports(dto)
        ok &= check_no_orm_imports(dto)
        ok &= check_no_endpoint_imports(dto)
        if not ok:
            all_ok = False
    if not all_ok:
        sys.exit(1)
    print("All DTO checks passed.")


if __name__ == "__main__":
    main()
