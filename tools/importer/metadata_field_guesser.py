#!/usr/bin/env python3
"""
metadata_field_guesser.py

Scan a directory of JSON metadata files and infer the type for each
metadata field. Types are one of: STRING, DATE, BOOLEAN, LIST, NUMBER.

The script prints the final mapping of field -> type and reports any
conflicts where a field appears with different inferred types in the
dataset. It exits with code 1 when conflicts are found.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, Set

TYPES = ("STRING", "DATE", "BOOLEAN", "LIST", "NUMBER")


DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$")


def infer_type(value):
    """Infer one of the allowed types from a Python value.

    Returns None for null/unknown values which are ignored.
    """
    if value is None:
        return None
    if isinstance(value, bool):
        return "BOOLEAN"
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return "NUMBER"
    if isinstance(value, list):
        # Empty list -> treat as LIST (strings expected)
        if len(value) == 0:
            return "LIST"
        # List must contain only strings to be a valid LIST
        if all(isinstance(x, str) for x in value):
            return "LIST"
        # Mixed or non-string elements are unsupported for LIST
        # Return a sentinel string to let the caller report a clear error
        return "INVALID_LIST"
    if isinstance(value, str):
        s = value.strip()
        if DATE_RE.match(s):
            return "DATE"
        # fall back to string
        return "STRING"
    # Unknown python types will be stringified
    return "STRING"


def main() -> None:
    p = argparse.ArgumentParser(
        description=(
            "Guess metadata field types across JSON files and report conflicts."
        )
    )
    p.add_argument(
        "input_dir",
        help=("Directory containing JSON files to scan"),
    )
    args = p.parse_args()

    input_dir = Path(args.input_dir)
    if not input_dir.exists() or not input_dir.is_dir():
        p.error("input_dir does not exist or is not a directory")

    files = sorted(input_dir.glob("*.json"))
    if not files:
        print(f"No JSON files found in {input_dir}")
        return

    field_types: Dict[str, Set[str]] = {}
    examples: Dict[str, Dict[str, Set[str]]] = {}

    for f in files:
        try:
            obj = json.loads(f.read_text(encoding="utf-8"))
        except Exception as exc:
            print(f"Skipping {f.name}: could not read/parse JSON ({exc})")
            continue

        if not isinstance(obj, dict):
            print(f"Skipping {f.name}: JSON root is not an object")
            continue

        for key, val in obj.items():
            t = infer_type(val)
            if t is None:
                continue
            # Collect invalid-list occurrences separately for a clear error
            if t == "INVALID_LIST":
                # store under a special key in examples for reporting
                examples.setdefault(key, {}).setdefault(t, set())
                if len(examples[key][t]) < 20:
                    examples[key][t].add(f.name)
                continue

            field_types.setdefault(key, set()).add(t)
            examples.setdefault(key, {}).setdefault(t, set())
            if len(examples[key][t]) < 5:
                examples[key][t].add(f.name)

    # Report results
    conflicts = []
    invalid_lists = []
    print("\nInferred field types:\n")
    for key in sorted(field_types.keys()):
        types = sorted(field_types[key])
        type_str = ",".join(types)
        print(f"- {key}: {type_str}")
        if len(types) > 1:
            conflicts.append((key, types))
            # print examples per type
            for t in types:
                ex = ", ".join(sorted(examples.get(key, {}).get(t, [])))
                print(f"    sample files for {t}: {ex}")

    # Check for invalid lists collected during scanning
    for key in sorted(examples.keys()):
        if "INVALID_LIST" in examples.get(key, {}):
            invalid_lists.append((key, sorted(examples[key]["INVALID_LIST"])))
            print(f"- {key}: contains lists with non-string elements")
            sample = ", ".join(sorted(examples[key]["INVALID_LIST"]))
            print(f"    sample files: {sample}")

    if conflicts:
        print("\nConflicts detected for the following fields:")
        for key, types in conflicts:
            print(f"- {key}: types = {', '.join(types)}")
        print("\nPlease resolve type inconsistencies before importing.")
        raise SystemExit(1)

    if invalid_lists:
        print("\nInvalid LIST values detected (lists must contain only strings):")
        for key, files in invalid_lists:
            print(f"- {key}: example files = {', '.join(files[:20])}")
        print("\nPlease ensure list metadata values only contain strings.")
        raise SystemExit(1)

    # When everything is ok, print a convenient copy/paste block that can
    # be used as CLI arguments for the importer.
    print("\nNo conflicts found. All fields have a consistent type.")
    # Use the insertion order of field_types for a predictable mapping
    keys_order = list(field_types.keys())
    if keys_order:
        types_order = [next(iter(field_types[k])) for k in keys_order]
        keys_str = " ".join(map(lambda x: f'"{x}"', keys_order))
        types_str = " ".join(types_order)

        print("\nEverything is ok. You can copy paste this:")
        print("--metadata_keys " + keys_str + " \\")
        print("--metadata_types " + types_str)


if __name__ == "__main__":
    main()
