import argparse
import json
from pathlib import Path
from typing import Any

from dats_api import DATSAPI
from tqdm import tqdm

parser = argparse.ArgumentParser(description="DATS file importer")
parser.add_argument(
    "--input_dir",
    type=str,
    help="Path to directory containing .txt or image files to be imported",
    required=True,
    dest="input_dir",
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
    help="ID of the project to import to",
    default="-1",
    dest="project_id",
    required=True,
)
parser.add_argument(
    "--metadata_keys",
    nargs="+",
    help="JSON keys to be used as metadata, e.g. --metadata_keys author published_date visited_date",
    default=[],
    dest="metadata_keys",
)
parser.add_argument(
    "--metadata_types",
    nargs="+",
    help="Type of the metadata keys metadata, e.g. --metadata_types STRING DATE DATE (possible values STRING DATE BOOLEAN LIST NUMBER)",
    default=[],
    dest="metadata_types",
)
parser.add_argument(
    "--doctype",
    help="Type of the documents to upload. Possible values text, image, audio, video",
    default="text",
    required=True,
    dest="doctype",
)
parser.add_argument(
    "--has_pages",
    help="Whether the documents have page files associated (set if one document is split into multiple pages)",
    default=False,
    action="store_true",
    dest="has_pages",
)
args = parser.parse_args()

if len(args.metadata_keys) != len(args.metadata_types):
    print("Number of metadata keys and types does not match!")
    exit()

api = DATSAPI(
    base_path=args.backend_url, username=args.username, password=args.password
)
api.login()
api.me()

# check if project exists
project = api.get_proj_by_id(args.project_id)
if project is None:
    print(f"Project with ID {args.project_id} does not exist!")
    exit()

# create project metadata (if it does not exist already)
project_metadatas = api.read_all_project_metadata(proj_id=project["id"])
project_metadatas = [
    meta for meta in project_metadatas if meta["doctype"] == args.doctype
]
project_metadata_map = {meta["key"]: meta for meta in project_metadatas}

for key, metatype in zip(args.metadata_keys, args.metadata_types):
    if key not in project_metadata_map:
        project_metadata = api.create_project_metadata(
            proj_id=project["id"],
            key=key,
            metatype=metatype,
            doctype=args.doctype,
            description=key,
        )
        project_metadata_map[key] = project_metadata

# chek if directory exists
directory = Path(args.input_dir)
if not directory.exists():
    print(f"{directory} does not exist!")
    exit()
if directory.is_file():
    print(f"{directory} is not a directory!")
    exit()

# read and check files
json_data: dict[int, Any] = dict()
sdoc_ids = []
files_in_dir = list(directory.glob("**/*.json"))
for idx, file in enumerate(
    tqdm(files_in_dir, f"Reading and checking files from {directory}!")
):
    # refresh login every 1000 files
    if idx % 1000 == 0:
        api.refresh_login()

    if not file.is_file():
        continue

    filename = file.name.replace(".json", ".html")
    try:
        data = json.loads(file.read_bytes())
        if data.get("filename"):
            filename = data["filename"]
        if args.has_pages:
            sdoc_ids = api.resolve_sdoc_id_from_proj_and_filename_with_pages(
                proj_id=project["id"], filename=filename
            )
        else:
            sdoc_id = api.resolve_sdoc_id_from_proj_and_filename(
                proj_id=project["id"], filename=filename
            )
            if sdoc_id is None:
                sdoc_ids = []
            else:
                sdoc_ids = [sdoc_id]
        if len(sdoc_ids) == 0:
            print(
                f"Skipping file {filename} because it does not exists in the project!"
            )
            continue
        for sdoc_id in sdoc_ids:
            json_data[sdoc_id] = data
    except Exception as e:
        print(f"Error with file: {filename} --> {e}")

# apply sdoc metadata
for idx, (sdoc_id, data) in enumerate(
    tqdm(json_data.items(), total=len(json_data), desc="Applying metadata to sdocs... ")
):
    # refresh login every 1000 files
    if idx % 1000 == 0:
        api.refresh_login()

    for metakey, metatype in zip(args.metadata_keys, args.metadata_types):
        if metakey in data:
            api.update_sdoc_metadata(
                sdoc_id=sdoc_id, key=metakey, metatype=metatype, value=data[metakey]
            )

print("(: FINISHED :)")
