#!/usr/bin/env python3
"""
date_converter.py

Scan a directory of JSON metadata files and add a date field composed from
the `year` and `month` fields. The produced date string is always in the
exact format: YYYY-MM-DDT00:00:00 (day is set to 1).

Usage:
    python date_converter.py /path/to/jsons --date-field date

The script will skip files that don't contain a parseable year. If the
requested date field already exists, the file is skipped (no overwrite).

Assumptions:
- Input JSON files are UTF-8 encoded and contain `year` and optionally
  `month` fields similar to the zotero converter output.
"""

from __future__ import annotations

import argparse
import datetime as _datetime
import json
import re
from pathlib import Path
from typing import Optional

MONTH_MAP = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "sept": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def parse_year(year_field: Optional[str]) -> Optional[int]:
    if not year_field:
        return None
    # Try to find a 4-digit year first
    m = re.search(r"(19|20)\d{2}", str(year_field))
    if m:
        return int(m.group(0))
    # Fallback to any integer
    try:
        return int(str(year_field).strip())
    except Exception:
        return None


def parse_month(month_field: Optional[str]) -> int:
    """Return month as int (1-12). Defaults to 1 when missing/unparseable."""
    if not month_field:
        return 1
    s = str(month_field).strip().lower()
    # Remove trailing dots or commas
    s = s.rstrip(".,")
    # If looks numeric, extract leading number
    m = re.match(r"^(\d{1,2})", s)
    if m:
        try:
            val = int(m.group(1))
            if 1 <= val <= 12:
                return val
        except Exception:
            pass
    # Normalize to first three letters
    key = re.sub(r"[^a-z]", "", s)[:3]
    return MONTH_MAP.get(key, 1)


def build_iso_date(year: int, month: int, day: int = 1) -> str:
    dt = _datetime.datetime(year, month, day)
    # Ensure the format exactly matches YYYY-MM-DDT00:00:00
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def process_file(path: Path, date_field: str) -> bool:
    """Process a single file. Returns True if file was updated."""
    try:
        text = path.read_text(encoding="utf-8")
        obj = json.loads(text)
    except Exception as exc:
        print(f"Skipping {path.name}: could not read/parse JSON ({exc})")
        return False

    if date_field in obj:
        print(f"Skipping {path.name}: '{date_field}' already present")
        return False

    year = parse_year(obj.get("year"))
    if not year:
        print(f"Skipping {path.name}: no parseable year")
        return False

    month = parse_month(obj.get("month"))
    iso = build_iso_date(year, month, 1)
    obj[date_field] = iso

    try:
        dump = json.dumps(obj, ensure_ascii=False, indent=4)
        path.write_text(dump, encoding="utf-8")
        print(f"Updated {path.name}: set {date_field} = {iso}")
        return True
    except Exception as exc:
        print(f"Failed to write {path.name}: {exc}")
        return False


def main() -> None:
    p = argparse.ArgumentParser(
        description=("Add ISO date field to JSON metadata files")
    )
    p.add_argument(
        "input_dir",
        help=("Directory containing JSON files to process"),
    )
    p.add_argument(
        "--date-field",
        default="date",
        help="Name of the date field to add (default: date)",
    )
    args = p.parse_args()

    input_dir = Path(args.input_dir)
    if not input_dir.exists() or not input_dir.is_dir():
        p.error(f"input_dir does not exist or is not a directory: {input_dir}")

    files = sorted(input_dir.glob("*.json"))
    if not files:
        print(f"No JSON files found in {input_dir}")
        return

    updated = 0
    for f in files:
        if process_file(f, args.date_field):
            updated += 1

    print(f"Done. Processed {len(files)} files, updated {updated} files.")


if __name__ == "__main__":
    main()
