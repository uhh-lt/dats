import argparse
import json
from pathlib import Path
from time import sleep
from typing import List, Tuple

import magic
from dwts_api import DWTSAPI
from tqdm import tqdm

parser = argparse.ArgumentParser(description="DWTS file importer")
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
    help="URL of the dwts backend api",
    default="http://localhost:5500/",
    dest="backend_url",
)
parser.add_argument(
    "--username",
    type=str,
    help="The username",
    default="SYSTEM@dwts.org",
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
    required=True,
    dest="content_key",
)
args = parser.parse_args()

if len(args.metadata_keys) != len(args.metadata_types):
    print("Number of metadata keys and types does not match!")
    exit()

api = DWTSAPI(
    base_path=args.backend_url, username=args.username, password=args.password
)
api.login()

# create new project if it does not exist
# if project_id is set, use that
if args.project_id != -1:
    project = api.get_proj_by_id(args.project_id)
    if project is None:
        print(f"Project with ID {args.project_id} does not exist!")
        exit()
else:
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
            proj_id=project["id"], key=key, metatype=metatype, doctype=args.doctype
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
files: List[Tuple[str, Tuple[str, bytes, str]]] = []
json_data = dict()
for file in directory.iterdir():
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
            json_data[filename] = data
            mime = magic.from_buffer(data[args.content_key], mime=True)
            if (
                mime != "text/html"
                and mime != "application/xhtml+xml"
                and mime != "text/plain"
            ):
                print(f"Skipping file {filename} because mime is not supported!")
                continue
            sdoc_id = api.resolve_sdoc_id_from_proj_and_filename(
                proj_id=project["id"], filename=filename
            )
            if sdoc_id is not None:
                print(
                    f"Skipping file {filename} because it already exists in the project!"
                )
                continue

            content = str(data[args.content_key])
            files.append(("uploaded_files", (filename, content.encode("utf-8"), mime)))
        except Exception as e:
            print(f"Error with file: {filename} --> {e}")
    else:
        file_bytes = file.read_bytes()
        mime = magic.from_buffer(file_bytes, mime=True)
        files.append(("uploaded_files", (filename, file_bytes, mime)))

if len(files) != 0:
    # status before upload
    status = api.read_project_status(proj_id=project["id"])
    sdocs_in_project = status["num_sdocs_finished"]

    # file upload
    num_files_to_upload = api.upload_files(
        proj_id=project["id"],
        files=files,
        filter_duplicate_files_before_upload=args.filter_duplicate_files_before_upload,
    )

    # wait for pre-processing to finishe
    status = api.read_project_status(proj_id=project["id"])
    while status["num_sdocs_finished"] != (sdocs_in_project + num_files_to_upload):
        sleep(5)
        status = api.read_project_status(proj_id=project["id"])
        print(
            f"Uploading documents. Current status: {status['num_sdocs_finished'] - sdocs_in_project} / {num_files_to_upload}"
        )

    print("Upload success!")

# create new tag if it does not exist
tag = api.get_tag_by_title(proj_id=project["id"], title=args.tag_name)
if tag is None:
    tag = api.create_tag(
        title=args.tag_name,
        description=args.tag_description,
        color="blue",
        proj_id=project["id"],
    )

# apply tag to all untagged documents
tag_ids = [tag["id"] for tag in api.read_all_tags(proj_id=project["id"])]
sdoc_ids = set(api.read_all_sdocs(proj_id=project["id"]))
tagged_sdoc_ids = set(api.read_all_sdocs_by_tags(proj_id=project["id"], tags=tag_ids))
untagged_sdoc_ids = sdoc_ids - tagged_sdoc_ids
api.bulk_apply_tags(sdoc_ids=list(untagged_sdoc_ids), tag_ids=[tag["id"]])

# apply sdoc metadata
applied = set()
print("Applying metadata to sdocs!")
for filename, data in tqdm(json_data.items(), total=len(json_data)):
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

    # TODO: what about this?
    # for image_name in data["image_names"]:
    #     if image_name:
    #         sdoc_id = api.resolve_sdoc_id_from_proj_and_filename(
    #             proj_id=project["id"], filename=filename
    #         )
    #         if sdoc_id not in applied and sdoc_id is not None:
    #             api.create_metadata(sdoc_id=sdoc_id, key="origin", value=data["url"])
    #             if "published_date" in data and data["published_date"] != "":
    #                 api.create_metadata(
    #                     sdoc_id=sdoc_id,
    #                     key="published_date",
    #                     value=data["published_date"],
    #                 )
    #             if "visited_date" in data and data["visited_date"] != "":
    #                 api.create_metadata(
    #                     sdoc_id=sdoc_id, key="visited_date", value=data["visited_date"]
    #                 )
    #             if "author" in data and data["author"] != "":
    #                 api.create_metadata(
    #                     sdoc_id=sdoc_id, key="author", value=data["author"]
    #                 )
    #             applied.add(sdoc_id)

print("(: FINISHED :)")
