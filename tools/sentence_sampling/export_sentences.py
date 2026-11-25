"""Exports every sentence of the finished text documents of a DATS project into a CSV.

One row per sentence, sorted by sdoc_id and sentence_idx, so that the same project
state always gives the same file. sentence_idx is the sentence number DATS uses for
sentence annotations. A manifest JSON next to the CSV records the counts, the
documents that were left out and the SHA-256 of the CSV.
"""

import argparse
import csv
import json
import re
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dats_api import DATSAPI
from loguru import logger
from sampling_utils import DEFAULT_DATA_DIR, connect, sha256_of
from tqdm import tqdm

COLUMNS = [
    "sentence_uid",
    "sdoc_id",
    "sentence_idx",
    "n_sentences",
    "year",
    "sdoc_name",
    "sdoc_filename",
    "sentence_text",
]
STATUS_FINISHED = 1
STATUS_PROCESSING = 0
STATUS_ERRONEOUS = -100
YEAR_PATTERN = re.compile(r"\d{4}")
YEAR_METATYPES = ("NUMBER", "STRING")


@dataclass
class ExportedDocument:
    sdoc: dict[str, Any]
    sentences: list[str]
    year: int | None


@dataclass
class ExportStats:
    n_sentences: int = 0
    sdoc_ids_without_year: list[int] = field(default_factory=list)
    sdoc_ids_without_sentences: list[int] = field(default_factory=list)


def parse_year(metadata: dict[str, Any] | None) -> int | None:
    """The year of a metadata value of type number or string (YYYY). DATS stores an
    unset number as 0 and an unset string as "", both mean no year."""
    if metadata is None:
        return None
    if metadata["int_value"] is not None:
        return metadata["int_value"] or None
    str_value = (metadata["str_value"] or "").strip()
    if YEAR_PATTERN.fullmatch(str_value):
        return int(str_value)
    return None


def fetch_document(
    api: DATSAPI, sdoc: dict[str, Any], year_key: str
) -> ExportedDocument:
    data = api.read_sdoc_data(sdoc["id"])
    metadata = api.read_sdoc_metadata_by_key(sdoc["id"], year_key)
    return ExportedDocument(
        sdoc=sdoc, sentences=data["sentences"], year=parse_year(metadata)
    )


def write_csv(
    path: Path, api: DATSAPI, sdocs: list[dict[str, Any]], year_key: str, workers: int
) -> ExportStats:
    """Fetches the documents in parallel and writes their sentences in the order of sdocs.
    Writes to a .partial file first, so that a failed export leaves no complete-looking CSV."""
    stats = ExportStats()
    partial = path.with_suffix(".csv.partial")
    executor = ThreadPoolExecutor(max_workers=workers)
    try:
        with partial.open("w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f, lineterminator="\n")
            writer.writerow(COLUMNS)
            # map yields in the order of sdocs, so the rows stay sorted
            documents = executor.map(
                lambda sdoc: fetch_document(api, sdoc, year_key), sdocs
            )
            for doc in tqdm(documents, total=len(sdocs), desc="Documents"):
                sdoc_id = doc.sdoc["id"]
                if doc.year is None:
                    stats.sdoc_ids_without_year.append(sdoc_id)
                if not doc.sentences:
                    stats.sdoc_ids_without_sentences.append(sdoc_id)
                for sentence_idx, sentence in enumerate(doc.sentences):
                    writer.writerow(
                        [
                            f"{sdoc_id}:{sentence_idx}",
                            sdoc_id,
                            sentence_idx,
                            len(doc.sentences),
                            "" if doc.year is None else doc.year,
                            doc.sdoc["name"],
                            doc.sdoc["filename"],
                            sentence,
                        ]
                    )
                stats.n_sentences += len(doc.sentences)
    finally:
        # after a failed request, do not wait for the remaining ones
        executor.shutdown(wait=True, cancel_futures=True)
    partial.replace(path)
    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--backend_url",
        required=True,
        help="the API URL, e.g. https://dats.example.org/api/",
    )
    parser.add_argument("--project_id", type=int, required=True)
    parser.add_argument("--username", required=True)
    parser.add_argument(
        "--year_key",
        default="year",
        help="the project metadata key that holds the year",
    )
    parser.add_argument(
        "--workers", type=int, default=4, help="number of parallel requests"
    )
    parser.add_argument(
        "--data_dir",
        type=Path,
        default=DEFAULT_DATA_DIR,
        help="the folder that receives the export",
    )
    args = parser.parse_args()

    output: Path = args.data_dir / f"sentence_export_project_{args.project_id}.csv"
    manifest_path = output.with_suffix(".manifest.json")
    api = connect(args.backend_url, args.username)

    # the year key must exist, otherwise every year would silently be empty
    text_metadata = {
        m["key"]: m
        for m in api.read_all_project_metadata(args.project_id)
        if m["doctype"] == "text"
    }
    if args.year_key not in text_metadata:
        raise SystemExit(
            f"Project {args.project_id} has no text metadata key '{args.year_key}'. "
            f"Available keys: {', '.join(sorted(text_metadata))}"
        )
    # DATS fills an unset date with the day the value was created, so a missing
    # year could not be told apart from a real one
    year_metatype = text_metadata[args.year_key]["metatype"]
    if year_metatype not in YEAR_METATYPES:
        raise SystemExit(
            f"The metadata key '{args.year_key}' has the type {year_metatype}; the "
            f"year must be one of {', '.join(YEAR_METATYPES)}"
        )

    finished = api.read_sdocs_by_status(args.project_id, STATUS_FINISHED)
    processing = api.read_sdocs_by_status(args.project_id, STATUS_PROCESSING)
    erroneous = api.read_sdocs_by_status(args.project_id, STATUS_ERRONEOUS)
    text_sdocs = sorted(
        (sdoc for sdoc in finished if sdoc["doctype"] == "text"),
        key=lambda sdoc: sdoc["id"],
    )
    non_text_sdocs = [sdoc for sdoc in finished if sdoc["doctype"] != "text"]
    logger.info(
        f"Project {args.project_id}: {len(text_sdocs)} finished text documents, "
        f"{len(non_text_sdocs)} finished non-text, {len(processing)} processing, "
        f"{len(erroneous)} erroneous documents"
    )
    if processing or erroneous:
        logger.warning(
            "Not all documents are finished; the unfinished ones are left out "
            "and listed in the manifest"
        )

    output.parent.mkdir(parents=True, exist_ok=True)
    stats = write_csv(output, api, text_sdocs, args.year_key, args.workers)

    manifest = {
        "backend_url": api.base_url,
        "project_id": args.project_id,
        "year_key": args.year_key,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "csv_file": output.name,
        "csv_sha256": sha256_of(output),
        "columns": COLUMNS,
        "counts": {
            "exported_documents": len(text_sdocs),
            "exported_sentences": stats.n_sentences,
            "documents_without_year": len(stats.sdoc_ids_without_year),
            "documents_without_sentences": len(stats.sdoc_ids_without_sentences),
            "skipped_non_text_documents": len(non_text_sdocs),
            "skipped_processing_documents": len(processing),
            "skipped_erroneous_documents": len(erroneous),
        },
        "sdoc_ids": {
            "without_year": stats.sdoc_ids_without_year,
            "without_sentences": stats.sdoc_ids_without_sentences,
            "skipped_non_text": sorted(sdoc["id"] for sdoc in non_text_sdocs),
            "skipped_processing": sorted(sdoc["id"] for sdoc in processing),
            "skipped_erroneous": sorted(sdoc["id"] for sdoc in erroneous),
        },
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    logger.info(
        f"Wrote {stats.n_sentences} sentences of {len(text_sdocs)} documents to {output}"
    )
    logger.info(f"Wrote the manifest to {manifest_path}")
    if stats.sdoc_ids_without_year:
        logger.warning(
            f"{len(stats.sdoc_ids_without_year)} documents have no year, see the manifest"
        )


if __name__ == "__main__":
    main()
