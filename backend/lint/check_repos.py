#!/usr/bin/env python3
"""
check_repos.py

This script enforces multiple rules for *_repo.py files:
1. Only import DTOs from their own module/folder (check_dto imports)
2. Do not import any *_service.py files (check_no_service_imports)
3. Do not import any *_endpoint.py files (check_no_endpoint_imports)
4. Ensure that the repo file is inside a directory named 'repos' under src_root (check_repo_in_repos_dir)
"""

import os
import re
import sys
from pathlib import Path


def find_repo_files(root):
    for dirpath, _, filenames in os.walk(root):
        for filename in filenames:
            if filename.endswith("_repo.py"):
                yield os.path.join(dirpath, filename)


def check_dto_imports(repo_path, src_root):
    repo_dir = Path(repo_path).parent.resolve()
    violations = []
    with open(repo_path, encoding="utf-8") as f:
        lines = f.readlines()
    imports = set()
    for line in lines:
        line = line.strip()
        if line.startswith("from "):
            parts = line.split()
            if len(parts) >= 2 and parts[1].endswith("_dto"):
                imports.add(parts[1])
        elif line.startswith("import "):
            modules = line[len("import ") :].split(",")
            for mod in modules:
                mod = mod.strip().split()[0]
                if mod.endswith("_dto"):
                    imports.add(mod)
    for imported in imports:
        import_path = imported.replace(".", os.sep) + ".py"
        imported_file = (src_root / import_path).resolve()
        imported_dir = imported_file.parent
        if imported_dir != repo_dir:
            violations.append(imported)
    if violations:
        print(
            f"Violation in {repo_path}: imports {violations}. DTOs must be from the same folder as the repo!"
        )
        return False
    return True


def check_no_service_imports(repo_path):
    violations = []
    with open(repo_path, encoding="utf-8") as f:
        lines = f.readlines()
    for i, line in enumerate(lines, 1):
        if re.search(r"^(from|import)\s+.*_service\b", line):
            violations.append((i, line.strip()))
    if violations:
        print(f"Violation in {repo_path}: imports service files:")
        for lineno, code in violations:
            print(f"  Line {lineno}: {code}")
        return False
    return True


def check_no_endpoint_imports(repo_path):
    violations = []
    with open(repo_path, encoding="utf-8") as f:
        lines = f.readlines()
    for i, line in enumerate(lines, 1):
        if re.search(r"^(from|import)\s+.*_endpoint\b", line):
            violations.append((i, line.strip()))
    if violations:
        print(f"Violation in {repo_path}: imports endpoint files:")
        for lineno, code in violations:
            print(f"  Line {lineno}: {code}")
        return False
    return True


def check_repo_in_repos_dir(repo_path, src_root):
    # The repo file must be inside a directory named 'repos' under src_root
    repo_path = Path(repo_path).resolve()
    repos_dir = (src_root / "repos").resolve()
    try:
        repo_path.relative_to(repos_dir)
    except ValueError:
        print(f"Violation: {repo_path} is not inside the 'repos' directory!")
        return False
    return True


def main():
    root = Path(__file__).parent.parent / "src"
    all_ok = True
    for repo in find_repo_files(root):
        ok = True
        ok &= check_dto_imports(repo, root)
        ok &= check_no_service_imports(repo)
        ok &= check_no_endpoint_imports(repo)
        ok &= check_repo_in_repos_dir(repo, root)
        if not ok:
            all_ok = False
    if not all_ok:
        sys.exit(1)
    print("All repo checks passed.")


if __name__ == "__main__":
    main()
