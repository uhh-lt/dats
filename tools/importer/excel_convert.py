import argparse
import json
import shutil
import sys
import unicodedata
from pathlib import Path

# uvpip install pandas openpyxl
import pandas as pd


def _load_excel(input_path: Path) -> pd.DataFrame:
    """Load excel file into a pandas DataFrame."""
    return pd.read_excel(input_path)


def _parse_rows_to_records(
    df: pd.DataFrame, filename_col: str, force_string_fields=None
):
    """Convert DataFrame rows into records.

    Each record: {entry_key, file_key, filename, article(dict of metadata)}
    If a row lacks the filename column or the value is empty, emit a warning
    to stderr and skip the row.
    """
    records = []
    # determine id column if present
    id_cols = [c for c in ("ID", "id", "key") if c in df.columns]

    if force_string_fields is None:
        force_string_fields = []
    force_set = set(force_string_fields)

    for idx, row in df.iterrows():
        entry_key = None
        if id_cols:
            entry_key = row.get(id_cols[0])
        if entry_key is None or (isinstance(entry_key, float) and pd.isna(entry_key)):
            entry_key = f"row{idx}"

        if filename_col not in df.columns:
            print(
                f"Warning: filename column '{filename_col}' not present in sheet; skipping row {idx}",
                file=sys.stderr,
            )
            continue

        fname_val = row.get(filename_col)
        if fname_val is None or (isinstance(fname_val, float) and pd.isna(fname_val)):
            print(
                f"Warning: entry '{entry_key}' has no filename in column '{filename_col}'; skipping",
                file=sys.stderr,
            )
            continue

        source = str(fname_val).strip()
        source_name = Path(source).name.replace("\\", "")
        if not source_name:
            print(
                f"Warning: entry '{entry_key}' filename empty after normalization; skipping",
                file=sys.stderr,
            )
            continue

        file_key = source_name.rsplit(".", 1)[0]
        # Use the filename (basename) as the entry key
        entry_key = source_name

        # collect row metadata into a dict (convert NaN to None)
        article = {}
        for col in df.columns:
            val = row.get(col)
            if pd.isna(val):
                continue
            # force certain fields to string type if requested
            if col in force_set:
                article[str(col)] = str(val)
            else:
                # convert numpy types to python native via json dump compatibility
                article[str(col)] = val

        article["filename"] = source_name

        records.append(
            {
                "entry_key": entry_key,
                "file_key": file_key,
                "filename": source_name,
                "article": article,
            }
        )

    return records


def _validate_entry_jsons(records, files_dir: Path):
    """Attach matched_path for records whose filename is found under files_dir.

    Performs recursive search; when multiple matches choose the shortest path.
    Prints a warning to stderr for missing files and returns only valid records.
    """
    files_dir = Path(files_dir)
    valid = []
    for r in records:
        filename = r["filename"]
        try:
            # Try exact rglob first (fast path)
            matches = list(files_dir.rglob(filename))
        except Exception:
            matches = []

        if not matches:
            # Normalization-aware fallback: compare Unicode-normalized basenames
            norm_target = unicodedata.normalize("NFC", filename)
            norm_target_lower = norm_target.lower()
            matches = []
            try:
                for p in files_dir.rglob("*"):
                    if not p.is_file():
                        continue
                    try:
                        name = p.name
                    except Exception:
                        continue
                    name_norm = unicodedata.normalize("NFC", name)
                    if (
                        name_norm == norm_target
                        or name_norm.lower() == norm_target_lower
                    ):
                        matches.append(p)
            except Exception:
                matches = []

        if matches:
            chosen = min(matches, key=lambda p: len(str(p)))
            r["matched_path"] = Path(chosen)
            valid.append(r)
        else:
            key = r.get("entry_key") or "<unknown>"
            print(
                f"Warning: file for entry '{key}' not found under '{files_dir}'; skipping JSON",
                file=sys.stderr,
            )
    return valid


def _copy_matched_files(records, dest_dir: Path):
    """Copy matched files (attached as `matched_path`) into `dest_dir`.

    Overwrites files with the same basename. Errors are printed to stderr.
    """
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    for r in records:
        mp = r.get("matched_path")
        if not mp:
            continue
        try:
            target = dest_dir / mp.name
            shutil.copy2(mp, target)
        except Exception as e:
            key = r.get("entry_key") or "<unknown>"
            print(
                f"Error copying file for entry '{key}' from '{mp}' to '{dest_dir}': {e}",
                file=sys.stderr,
            )


def _write_entry_jsons(records, output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    for r in records:
        file_key = r["file_key"]
        article = r["article"]
        json_path = output_dir / f"{file_key}.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(article, f, indent=4, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(
        description="Convert Excel metadata to per-file JSONs"
    )
    parser.add_argument(
        "xlsxfile", metavar="XLSXFILE", help="Path to the input .xlsx file"
    )
    parser.add_argument(
        "--filename-col",
        required=True,
        help="Column name in the Excel sheet that contains the filename",
    )
    parser.add_argument(
        "--files",
        required=True,
        help="Path to files directory (Zotero-style files tree) to search for originals",
    )
    parser.add_argument(
        "--output",
        "-o",
        help="Optional output folder for JSON files (default: input folder/json)",
    )
    parser.add_argument(
        "--output-files",
        help="Destination folder to copy matched files into (default: input_folder/data)",
    )
    parser.add_argument(
        "--force-string-type",
        nargs="+",
        help="List of column names to force to string when writing JSON (e.g. --force-string-type Volume Issue Page)",
        default=[],
    )

    args = parser.parse_args()

    input_path = Path(args.xlsxfile)
    if not input_path.exists():
        print(f"Input file does not exist: {input_path}", file=sys.stderr)
        sys.exit(2)

    output_dir = Path(args.output) if args.output else input_path.parent / "json"
    output_files_dir = (
        Path(args.output_files) if args.output_files else input_path.parent / "data"
    )

    df = _load_excel(input_path)
    records = _parse_rows_to_records(df, args.filename_col, args.force_string_type)
    records = _validate_entry_jsons(records, Path(args.files))
    _copy_matched_files(records, output_files_dir)
    _write_entry_jsons(records, output_dir)


if __name__ == "__main__":
    main()
