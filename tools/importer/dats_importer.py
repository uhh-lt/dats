import argparse
import json
from pathlib import Path
from time import sleep

import magic
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
    "--project_name",
    type=str,
    help="Name of the project to import to",
    default="import",
    dest="project_name",
)
parser.add_argument(
    "--project_id",
    type=int,
    help="ID of the project to import to",
    default="-1",
    dest="project_id",
)
parser.add_argument(
    "--project_description",
    type=str,
    help="Description of the project to create (only if new project is created)",
    default="",
    dest="project_description",
)
parser.add_argument(
    "--tag_name",
    type=str,
    help="Name of the tag that is automatically applied to all documents",
    default="test",
    dest="tag_name",
)
parser.add_argument(
    "--tag_description",
    type=str,
    help="Description of the tag that is automatically applied to all documents",
    default="",
    dest="tag_description",
)
parser.add_argument(
    "--tag_key",
    type=str,
    help="JSON key to be used as tag, e.g. --tag_key tags. Has to be a list of strings. If not set, no tag will be applied.",
    default="",
    dest="tag_key",
)
parser.add_argument(
    "--is_json",
    help="Set if the input_dir contains JSON files",
    default=False,
    dest="is_json",
    action="store_true",
)
parser.add_argument(
    "--filter_duplicate_files_before_upload",
    help="If true duplicate file (with the same name) will be filtered out before uploading!",
    default=False,
    dest="filter_duplicate_files_before_upload",
    action="store_true",
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
    "--content_key",
    help="For JSON files, the key of the content field. Default is html",
    default="html",
    required=False,
    dest="content_key",
)
parser.add_argument(
    "--mime_type",
    help="The mime type of the content / uploaded document. Defaults to using magic for autodetect",
    default=None,
    required=False,
    dest="mime_type",
)
parser.add_argument(
    "--file_extension",
    help="In the directory, only files with this extension will be uploaded. Default is *",
    default="*",
    required=False,
    dest="file_extension",
)
parser.add_argument(
    "--max_num_docs",
    help="The maximum number of documents to upload. Default is no limit",
    type=int,
    default=-1,
    required=False,
    dest="max_num_docs",
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

# if project_id is set, use that
if args.project_id != -1:
    project = api.get_proj_by_id(args.project_id)
    if project is None:
        print(f"Project with ID {args.project_id} does not exist!")
        exit()
else:
    # create new project if it does not exist
    title = args.project_name
    project = api.get_proj_by_title(title)
    if project is None:
        project = api.create_project(title=title, description=args.project_description)

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

# upload files
directory = Path(args.input_dir)
if not directory.exists():
    print(f"{directory} does not exist!")
    exit()
if directory.is_file():
    print(f"{directory} is not a directory!")
    exit()

# read files from directory
#           dict_key        name, content, mime
files: list[tuple[str, tuple[str, bytes, str]]] = []
tags: set[str] = set()
json_data = dict()
files_in_dir = list(directory.glob(f"**/*.{args.file_extension}"))
for file in tqdm(files_in_dir, f"Reading and checking files from {directory}!"):
    if not file.is_file():
        continue

    filename = file.name  # if len(file.name) < 100 else file.stem[: (100 - len(file.suffix))] + file.suffix

    if args.is_json:
        filename = file.name.replace(".json", ".html")
        try:
            data = json.loads(file.read_bytes())
            if data[args.content_key] == "":
                print(f"Skipping file {file.name} because {args.content_key} is empty!")
                continue
            if args.mime_type is None:
                mime = magic.from_buffer(data[args.content_key], mime=True)
            else:
                mime = args.mime_type

            if args.tag_key != "" and args.tag_key in data:
                tags.update(data[args.tag_key])

            json_data[filename] = data
            content = str(data[args.content_key])
            files.append(("uploaded_files", (filename, content.encode("utf-8"), mime)))
        except Exception as e:
            print(f"Error with file: {filename} --> {e}")
    else:
        file_bytes = file.read_bytes()
        if args.mime_type is None:
            mime = magic.from_buffer(file_bytes, mime=True)
        else:
            mime = args.mime_type
        files.append(("uploaded_files", (filename, file_bytes, mime)))

# remove duplicate files by name
temp = {upload_file[1][0]: upload_file for upload_file in files}
files = list(temp.values())

print(f"Uploading {len(files)} files to project '{project['title']}'!")
if (args.max_num_docs != -1) and (len(files) > args.max_num_docs):
    print("WARNING: More files found than max_num_docs!")
    print(f"Limited to {args.max_num_docs}.")

# upload files
uploading_files = files[: args.max_num_docs] if args.max_num_docs != -1 else files
api.upload_files(
    proj_id=project["id"],
    files=uploading_files,
    filter_duplicate_files_before_upload=args.filter_duplicate_files_before_upload,
)
api.refresh_login()

# wait for success
sleep(30)
num_processing_docs = len(
    api.read_preprocessing_status(project_id=project["id"], status=0)
)
is_finished = num_processing_docs == 0
with tqdm(
    total=len(uploading_files), desc="Document Preprocessing: ", position=1
) as pbar:
    while not is_finished:
        sleep(30)
        num_processing_docs = len(
            api.read_preprocessing_status(project_id=project["id"], status=0)
        )
        is_finished = num_processing_docs == 0
        pbar.update(len(uploading_files) - num_processing_docs)

# create new tag if it does not exist
api.refresh_login()
tag = api.get_tag_by_name(proj_id=project["id"], name=args.tag_name)
if tag is None:
    tag = api.create_tag(
        name=args.tag_name,
        description=args.tag_description,
        color="blue",
        proj_id=project["id"],
    )

# apply tag to all untagged documents
tag_ids = [tag["id"] for tag in api.read_all_tags(proj_id=project["id"])]
sdoc_ids = set(api.read_all_sdoc_ids(proj_id=project["id"]))
tagged_sdoc_ids = set(
    api.read_all_sdoc_ids_by_tags(proj_id=project["id"], tags=tag_ids)
)
untagged_sdoc_ids = sdoc_ids - tagged_sdoc_ids
api.bulk_apply_tags(sdoc_ids=list(untagged_sdoc_ids), tag_ids=[tag["id"]])

# apply tag to all documents with tag_key
if args.tag_key != "":
    tag_name2_ids = dict()
    for tag_name in tags:
        tag = api.get_tag_by_name(proj_id=project["id"], name=tag_name)
        if tag is None:
            tag = api.create_tag(
                name=tag_name, description=tag_name, color="blue", proj_id=project["id"]
            )
        tag_name2_ids[tag_name] = tag["id"]

    idx = 0
    for filename, data in tqdm(
        json_data.items(), total=len(json_data), desc="Applying tags to sdocs... "
    ):
        # refresh login
        if idx % 1000 == 0:
            api.refresh_login()
        idx += 1

        tags_to_apply = data.get(args.tag_key, [])
        if len(tags_to_apply) == 0:
            continue

        sdoc_id = api.resolve_sdoc_id_from_proj_and_filename(
            proj_id=project["id"], filename=filename
        )
        if sdoc_id is not None:
            tag_ids = [tag_name2_ids[tag_name] for tag_name in tags_to_apply]
            api.bulk_apply_tags(sdoc_ids=[sdoc_id], tag_ids=tag_ids)

# apply sdoc metadata
applied = set()
idx = 0
for filename, data in tqdm(
    json_data.items(), total=len(json_data), desc="Applying metadata to sdocs... "
):
    # refresh login
    if idx % 1000 == 0:
        api.refresh_login()
    idx += 1

    sdoc_id = api.resolve_sdoc_id_from_proj_and_filename(
        proj_id=project["id"], filename=filename
    )
    if sdoc_id not in applied and sdoc_id is not None:
        for metakey, metatype in zip(args.metadata_keys, args.metadata_types):
            if metakey in data:
                api.update_sdoc_metadata(
                    sdoc_id=sdoc_id, key=metakey, metatype=metatype, value=data[metakey]
                )
        applied.add(sdoc_id)

print("(: FINISHED :)")
