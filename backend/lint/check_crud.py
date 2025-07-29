#!/usr/bin/env python3
"""
check_crud.py

This script enforces rules for CRUD files:
1. The main class must be named starting with 'CRUD'.
2. Methods in the CRUD class must be ordered: create*, read*, update*, delete*, then others.
3. Method names must start with: create, read, update, delete, or be after those.
"""

import ast
import os
import sys
from pathlib import Path

CRUD_PREFIXES = ["create", "read", "update", "delete"]


def find_crud_files(root):
    for dirpath, _, filenames in os.walk(root):
        for filename in filenames:
            if filename.endswith("_crud.py"):
                yield os.path.join(dirpath, filename)


def check_crud_class_and_method_order(crud_path):
    with open(crud_path, encoding="utf-8") as f:
        source = f.read()
    try:
        tree = ast.parse(source, filename=crud_path)
    except Exception as e:
        print(f"Violation in {crud_path}: Could not parse file: {e}")
        return False

    crud_class = None
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and node.name.startswith("CRUD"):
            crud_class = node
            break

    if not crud_class:
        print(f"Violation in {crud_path}: No class starting with 'CRUD' found.")
        return False

    methods = [n.name for n in crud_class.body if isinstance(n, ast.FunctionDef)]

    if not methods:
        # No methods in CRUD class is allowed, just skip
        return True

    def get_method_order(methods):
        order = []
        for name in methods:
            clean_name = name.lstrip("_")
            for idx, prefix in enumerate(CRUD_PREFIXES):
                if clean_name.startswith(prefix):
                    order.append(idx)
                    break
            else:
                order.append(len(CRUD_PREFIXES))  # "other"
        return order

    order = get_method_order(methods)
    last_seen = -1
    first_non_crud_idx = None
    for i, idx in enumerate(order):
        if idx < len(CRUD_PREFIXES):
            if first_non_crud_idx is not None:
                print(
                    f"Violation in {crud_path}: CRUD method '{methods[i]}' found after non-CRUD method '{methods[first_non_crud_idx]}' in class '{crud_class.name}'."
                )
                print("  Found methods in order:")
                for name in methods:
                    print(f"    {name}")
                return False
            if idx < last_seen:
                print(
                    f"Violation in {crud_path}: Method order in class '{crud_class.name}' is incorrect."
                )
                print("  Found methods in order:")
                for name in methods:
                    print(f"    {name}")
                return False
            last_seen = idx
        else:
            if first_non_crud_idx is None:
                first_non_crud_idx = i
    return True


def main():
    root = Path(__file__).parent.parent / "src"
    all_ok = True
    for crud in find_crud_files(root):
        ok = check_crud_class_and_method_order(crud)
        if not ok:
            all_ok = False
    if not all_ok:
        sys.exit(1)
    print("All CRUD checks passed.")


if __name__ == "__main__":
    main()
