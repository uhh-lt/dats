import argparse
import json
import shutil
import sys
from pathlib import Path

# See: https://bibtexparser.readthedocs.io/en/main/install.html
# pip install --no-cache-dir --force-reinstall git+https://github.com/sciunto-org/python-bibtexparser@main
import bibtexparser
import bibtexparser.middlewares as m

layers = [m.NormalizeFieldKeys(), m.LatexDecodingMiddleware(), m.SeparateCoAuthors()]

# Some BibTeX exports (Zotero, others) may contain duplicate field names
# inside the same entry (for example two `annote` fields). The underlying
# parser may produce DuplicateFieldKeyBlock objects and fail. To be robust we
# pre-process the raw .bib text: for each entry we merge duplicate fields by
# concatenating their values (separated by a blank line). This keeps the
# semantic information and allows `bibtexparser` to parse normally.


def _remove_duplicate_fields_in_entry(entry_text: str) -> str:
    """Remove duplicate fields inside a single @...{key, ...} entry.

    Keeps the first occurrence of any field (case-insensitive) and removes
    subsequent duplicates. For each removed duplicate the function prints a
    warning to stderr describing the entry type/key, the duplicate field
    name and a collapsed snippet of the removed content.

    The function returns a cleaned entry text suitable for parsing by
    bibtexparser.
    """
    # Find the opening brace that starts fields (the one after the key)
    try:
        first_brace = entry_text.index("{")
    except ValueError:
        return entry_text

    # Find the comma that separates the key from the fields (top-level)
    idx = first_brace + 1
    depth = 0
    comma_pos = None
    while idx < len(entry_text):
        c = entry_text[idx]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        elif c == "," and depth == 0:
            comma_pos = idx
            break
        idx += 1

    if comma_pos is None:
        return entry_text

    header = entry_text[: comma_pos + 1]
    fields_text = entry_text[comma_pos + 1 :].rstrip()

    # Remove the final trailing '}' from fields_text for processing
    if fields_text.endswith("}"):
        fields_text = fields_text[:-1]

    # Split fields by top-level commas only (ignore commas inside braces/quotes)
    parts = []
    buf = []
    depth = 0
    in_quote = False
    i = 0
    while i < len(fields_text):
        ch = fields_text[i]
        if ch == '"' and (i == 0 or fields_text[i - 1] != "\\"):
            in_quote = not in_quote
            buf.append(ch)
        elif not in_quote:
            if ch == "{":
                depth += 1
                buf.append(ch)
            elif ch == "}":
                depth = max(depth - 1, 0)
                buf.append(ch)
            elif ch == "," and depth == 0:
                part = "".join(buf).strip()
                if part:
                    parts.append(part)
                buf = []
            else:
                buf.append(ch)
        else:
            buf.append(ch)
        i += 1

    last = "".join(buf).strip()
    if last:
        parts.append(last)

    # Parse field assignments and detect duplicates (case-insensitive).
    # We keep the first occurrence and collect removed duplicates for warnings.
    fields = {}
    order = []
    removed = {}
    for raw_part in parts:
        if "=" not in raw_part:
            continue
        name, val = raw_part.split("=", 1)
        field_name = name.strip()
        key = field_name.lower()
        value = val.strip().rstrip(",")
        if key in fields:
            removed.setdefault(key, []).append(value)
        else:
            fields[key] = value
            order.append(key)

    # Extract entry type and key for warnings
    try:
        at_idx = entry_text.find("@")
        type_part = entry_text[at_idx + 1 : first_brace].strip()
        key_part = entry_text[first_brace + 1 : comma_pos].strip()
    except Exception:
        type_part = "entry"
        key_part = "<unknown>"

    # Emit warnings for removed duplicate fields (collapse whitespace for readability)
    for fname, vals in removed.items():
        for v in vals:
            snippet = " ".join(v.split())
            print(
                f'WARNING: {type_part} {key_part} had duplicate key "{fname}" removed content "{snippet}"',
                file=sys.stderr,
            )

    # Reconstruct fields in original order (keeping only first occurrences)
    new_fields = []
    for name in order:
        new_fields.append(f"{name} = {fields[name]}")

    new_entry = header + "\n  " + ",\n  ".join(new_fields) + "\n}"
    return new_entry


def _preprocess_bibtex_text(raw: str) -> str:
    """Process a full .bib file text and merge duplicate fields per entry.

    We locate each top-level entry (starting with '@') and apply merging.
    Non-entry text is preserved.
    """
    out = []
    i = 0
    n = len(raw)
    while i < n:
        if raw[i] != "@":
            out.append(raw[i])
            i += 1
            continue

        # Start of an entry; find matching closing brace by counting
        start = i
        # Find the first '{' after the '@'
        j = i
        while j < n and raw[j] != "{":
            j += 1
        if j >= n:
            out.append(raw[i])
            i += 1
            continue

        depth = 0
        k = j
        while k < n:
            if raw[k] == "{":
                depth += 1
            elif raw[k] == "}":
                depth -= 1
                if depth == 0:
                    # include trailing character
                    k += 1
                    break
            k += 1

        entry_text = raw[start:k]
        merged = _remove_duplicate_fields_in_entry(entry_text)
        out.append(merged)
        i = k

    return "".join(out)


def _load_and_parse_bibtex(input_path: Path):
    """Read, preprocess and parse a BibTeX file. Returns a bibtexparser.Library."""
    with open(input_path, "r", encoding="utf-8") as _f:
        _raw = _f.read()

    _processed = _preprocess_bibtex_text(_raw)
    return bibtexparser.parse_string(_processed, append_middleware=layers)


def clean_filename(filenamestr):
    """Parse a Zotero `file` field item and return (filename_key, source_name).

    The Zotero format is typically: "Description:relative/path/to/file.pdf:application/pdf".
    If parsing fails, print an error to stderr and return (None, None).
    """
    try:
        s = str(filenamestr)
    except Exception:
        print(f"Error: invalid file item type: {filenamestr!r}", file=sys.stderr)
        return None, None

    # Handle escaped colons that sometimes appear as "\:" by replacing them with ':'
    s = s.replace("\\:", ":")
    parts = s.split(":")

    # Prefer the penultimate part as the path when there are >=2 parts
    if len(parts) >= 2:
        path_part = parts[-2]
    else:
        path_part = parts[0]

    # Normalize and extract the basename
    try:
        source = Path(path_part).name.replace("\\", "")
        if not source:
            raise ValueError("empty filename")
        filename_key = source.rsplit(".", 1)[0]
        return filename_key, source
    except Exception as e:
        print(f"Error parsing file item '{s}': {e}", file=sys.stderr)
        return None, None


def _parse_entry_jsons(library):
    """Parse entries from parsed bibtex library into a list of article records.

    Each record is a dict with keys: `entry_key`, `file_key`, `filename`, `article`.
    Entries without `file` fields will yield no records but will print their key
    to stdout and a warning to stderr (preserving previous behavior).
    """
    records = []
    for entry in library.entries:
        base_article = {}
        fields = entry.fields_dict
        file_field = None
        for field in fields.keys():
            if field == "file":
                val = fields[field]
                file_field = val.value if hasattr(val, "value") else val
            else:
                val = fields[field]
                base_article[field] = val.value if hasattr(val, "value") else val

        entry_key = entry.key
        entry_title = entry.get("title").value if entry.get("title") else "<no title>"

        if file_field:
            file_items = [f.strip() for f in file_field.split(";") if f.strip()]
            for item in file_items:
                file_key, source = clean_filename(item)
                if not file_key or not source:
                    id_for_msg = entry_key or "<unknown>"
                    print(
                        f"Error: could not parse file item for entry '{id_for_msg}': {item}",
                        file=sys.stderr,
                    )
                    continue

                article = base_article.copy()
                article["filename"] = source
                records.append(
                    {
                        "entry_key": entry_key,
                        "file_key": file_key,
                        "filename": source,
                        "article": article,
                    }
                )
        else:
            if entry_key:
                print(
                    f"WARNING: entry '{entry_key}' - '{entry_title}' has no 'file' field; skipping JSON creation",
                    file=sys.stderr,
                )
            else:
                print(
                    "WARNING: BibTeX entry has no 'file' field and no key; skipping JSON creation",
                    file=sys.stderr,
                )

    return records


def _validate_entry_jsons(records, files_dir: Path):
    """Filter records by existence of corresponding files in `files_dir`.

    Returns a list of records whose `filename` exists somewhere under `files_dir`.
    This performs a recursive search (subdirectories included) because Zotero
    exports original files into numbered subfolders (e.g. `files/12345/name.pdf`).
    For each missing file, prints a warning to stderr.
    """
    files_dir = Path(files_dir)
    valid = []
    for r in records:
        # Search recursively for the filename under files_dir
        try:
            matches = list(files_dir.rglob(r["filename"]))
        except Exception:
            matches = []

        if matches:
            # Choose a deterministic match (shortest path string) and attach it
            chosen = min(matches, key=lambda p: len(str(p)))
            r["matched_path"] = Path(chosen)
            valid.append(r)
        else:
            key = r.get("entry_key") or "<unknown>"
            print(
                f"WARNING: file for entry '{key}' not found under '{files_dir}'; skipping JSON",
                file=sys.stderr,
            )
    return valid


def _copy_matched_files(records, dest_dir: Path):
    """Copy matched files (attached as `matched_path`) into `dest_dir`.

    Overwrites existing files with the same basename. Prints errors to stderr
    if copying fails for any file.
    """
    dest_dir = Path(dest_dir)
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
    """Write JSON files for each record in `records` to `output_dir`."""
    output_dir.mkdir(parents=True, exist_ok=True)
    for r in records:
        file_key = r["file_key"]
        article = r["article"]
        json_path = output_dir / f"{file_key}.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(article, f, indent=4, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(
        description="Convert Zotero-exported .bib to per-file JSONs"
    )
    parser.add_argument(
        "bibfile", metavar="BIBFILE", help="Path to the input .bib file"
    )
    parser.add_argument(
        "--output",
        "-o",
        help="Optional output folder for JSON files (default: input folder/json)",
    )
    parser.add_argument(
        "--files",
        required=True,
        help="Path to files directory; only write JSONs for files that exist in this folder",
    )
    parser.add_argument(
        "--output-files",
        help="Destination folder to copy matched files into (default: input_folder/data)",
    )
    args = parser.parse_args()

    input_path = Path(args.bibfile)
    if not input_path.exists():
        print(f"Input file does not exist: {input_path}", file=sys.stderr)
        sys.exit(2)

    output_dir = Path(args.output) if args.output else input_path.parent / "json"

    library = _load_and_parse_bibtex(input_path)
    records = _parse_entry_jsons(library)

    # files directory is now mandatory
    files_dir = Path(args.files)
    records = _validate_entry_jsons(records, files_dir)

    # determine output_files dir (where matched files are copied)
    output_files_dir = (
        Path(args.output_files) if args.output_files else input_path.parent / "data"
    )
    output_files_dir.mkdir(parents=True, exist_ok=True)

    # copy matched files to output_files_dir
    _copy_matched_files(records, output_files_dir)

    _write_entry_jsons(records, output_dir)


if __name__ == "__main__":
    main()
