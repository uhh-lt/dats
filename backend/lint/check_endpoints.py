#!/usr/bin/env python3
"""
check_endpoints.py

This script enforces multiple rules for *_endpoint.py files:
1. Only import DTOs from their own module/folder
(More rules can be added in the future.)
"""

import os
import sys
from pathlib import Path


def find_endpoint_files(root):
    for dirpath, _, filenames in os.walk(root):
        for filename in filenames:
            if filename.endswith("_endpoint.py"):
                yield os.path.join(dirpath, filename)


def check_dto_imports(endpoint_path, src_root):
    endpoint_dir = Path(endpoint_path).parent.resolve()
    violations = []
    with open(endpoint_path, encoding="utf-8") as f:
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
        if imported_dir != endpoint_dir:
            violations.append(imported)
    if violations:
        print(
            f"Violation in {endpoint_path}: imports {violations}. DTOs must be from the same folder as the endpoint!"
        )
        return False
    return True


def main():
    root = Path(__file__).parent.parent / "src"
    all_ok = True
    for endpoint in find_endpoint_files(root):
        ok = True
        ok &= check_dto_imports(endpoint, root)
        # (Add more checks here as needed)
        if not ok:
            all_ok = False
    if not all_ok:
        sys.exit(1)
    print("All endpoint checks passed.")


if __name__ == "__main__":
    main()
