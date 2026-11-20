"""Copy a NUMBER metadata holding years into a new DATE metadata.

For every doctype that has the NUMBER metadata <metadata_key>, the script creates
the DATE metadata <new_metadata_key> (default: <metadata_key>_date) and sets it to
January 1st of the year for every document. The NUMBER metadata stays untouched.
Running it again reuses the DATE metadata and writes the values again.

A DATE metadata always has a value: DATS fills a new one with today's date.
Documents whose year is not between 1 and 9999 (e.g. 0, the default of an empty
NUMBER metadata) keep that value and are listed at the end.
"""

import argparse
from datetime import date
from typing import Any

from dats_api import DATSAPI
from tqdm import tqdm

parser = argparse.ArgumentParser(
    description="Copy a NUMBER metadata holding years into a new DATE metadata"
)
parser.add_argument(
    "--backend_url",
    type=str,
    help="URL of the dats backend api",
    default="http://localhost:5500/",
    dest="backend_url",
)
parser.add_argument(
    "--username",
    type=str,
    help="The username",
    default="SYSTEM@dats.org",
    dest="username",
)
parser.add_argument(
    "--password",
    type=str,
    help="The password",
    default="12SYSTEM34",
    dest="password",
)
parser.add_argument(
    "--project_id",
    type=int,
    help="ID of the project",
    dest="project_id",
    required=True,
)
parser.add_argument(
    "--metadata_key",
    type=str,
    help="Key of the NUMBER metadata holding the years, e.g. year",
    dest="metadata_key",
    required=True,
)
parser.add_argument(
    "--new_metadata_key",
    type=str,
    help="Key of the DATE metadata to create (default: <metadata_key>_date)",
    default=None,
    dest="new_metadata_key",
)
parser.add_argument(
    "--batch_size",
    type=int,
    help="Number of metadata values updated per request",
    default=500,
    dest="batch_size",
)
parser.add_argument(
    "--dry_run",
    action="store_true",
    help="Only report what would be converted, change nothing",
    dest="dry_run",
)
args = parser.parse_args()

new_key: str = args.new_metadata_key or f"{args.metadata_key}_date"

api = DATSAPI(
    base_path=args.backend_url, username=args.username, password=args.password
)
api.login()

project = api.get_project_by_id(args.project_id)
print(f"Project '{project['title']}' (ID {args.project_id})")

# 1. find the NUMBER metadata (one per doctype) and its DATE counterpart
project_metadata = api.read_all_project_metadata(project_id=args.project_id)
old_metas = [m for m in project_metadata if m["key"] == args.metadata_key]
if len(old_metas) == 0:
    print(f"Metadata '{args.metadata_key}' does not exist in this project!")
    exit(1)
not_number = [m for m in old_metas if m["metatype"] != "NUMBER"]
if len(not_number) > 0:
    print(
        f"Metadata '{args.metadata_key}' is not of type NUMBER for doctypes "
        f"{[m['doctype'] for m in not_number]}!"
    )
    exit(1)

# old project metadata id -> new project metadata id (None in a dry run)
new_meta_id_by_old: dict[int, int | None] = {}
for old_meta in old_metas:
    doctype = old_meta["doctype"]
    existing = [
        m for m in project_metadata if m["key"] == new_key and m["doctype"] == doctype
    ]
    if len(existing) > 0 and existing[0]["metatype"] != "DATE":
        print(
            f"Metadata '{new_key}' ({doctype}) already exists with type "
            f"{existing[0]['metatype']}, choose another --new_metadata_key!"
        )
        exit(1)
    if len(existing) > 0:
        print(f"Reusing DATE metadata '{new_key}' ({doctype}).")
        new_meta_id_by_old[old_meta["id"]] = existing[0]["id"]
        continue
    if args.dry_run:
        print(f"Would create DATE metadata '{new_key}' ({doctype}).")
        new_meta_id_by_old[old_meta["id"]] = None
        continue
    created = api.create_project_metadata(
        project_id=args.project_id,
        key=new_key,
        metatype="DATE",
        doctype=doctype,
        description=old_meta["description"],
    )
    print(f"Created DATE metadata '{new_key}' ({doctype}).")
    new_meta_id_by_old[old_meta["id"]] = created["id"]

# 2. compute the new value of every document
updates: list[dict[str, Any]] = []
invalid: list[tuple[int, int | None]] = []  # (sdoc id, year)
valid_years = 0
sdoc_ids = api.read_all_sdoc_ids(project_id=args.project_id)
for i, sdoc_id in enumerate(tqdm(sdoc_ids, desc="Reading metadata")):
    if i > 0 and i % 1000 == 0:
        api.refresh_login()

    sdoc_metadata = api.read_all_sdoc_metadata(sdoc_id=sdoc_id)
    old_value = next(
        (m for m in sdoc_metadata if m["project_metadata_id"] in new_meta_id_by_old),
        None,
    )
    if old_value is None:
        continue  # a doctype without the metadata

    year = old_value["int_value"]
    if year is None or not 1 <= year <= 9999:
        invalid.append((sdoc_id, year))
        continue

    valid_years += 1
    if args.dry_run:
        continue

    new_meta_id = new_meta_id_by_old[old_value["project_metadata_id"]]
    new_value = next(
        (m for m in sdoc_metadata if m["project_metadata_id"] == new_meta_id), None
    )
    if new_value is None:
        print(f"Document {sdoc_id} has no metadata '{new_key}', skipping!")
        continue

    updates.append(
        {
            "sdoc_metadata_id": new_value["id"],
            "str_value": None,
            "int_value": None,
            "date_value": date(year, 1, 1).isoformat(),
            "boolean_value": None,
            "list_value": None,
        }
    )

# 3. write them
print(f"{valid_years} documents have a valid year.")
if args.dry_run:
    print("Dry run, nothing changed.")
else:
    api.refresh_login()
    for start in tqdm(range(0, len(updates), args.batch_size), desc="Writing metadata"):
        api.bulk_update_sdoc_metadata(updates[start : start + args.batch_size])
    print(f"Set '{new_key}' of {len(updates)} documents.")

if len(invalid) > 0:
    print(
        f"{len(invalid)} documents have no valid year in '{args.metadata_key}', "
        f"their '{new_key}' keeps its default (the date it was created):"
    )
    for sdoc_id, year in invalid:
        print(f"  document {sdoc_id}: {year}")
