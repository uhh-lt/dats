import argparse

from dats_api import DATSAPI
from tqdm import tqdm

parser = argparse.ArgumentParser(description="DATS sdoc remover")
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
    dest="project_id",
    required=True,
)
parser.add_argument(
    "--tag_name",
    type=str,
    help="Name of the tag of documents to remove",
    dest="tag_name",
    required=True,
)
args = parser.parse_args()

api = DATSAPI(
    base_path=args.backend_url, username=args.username, password=args.password
)
api.login()
api.me()

project = api.get_proj_by_id(args.project_id)
if project is None:
    print(f"Project with ID {args.project_id} does not exist!")
    exit()

tag = api.get_tag_by_name(proj_id=args.project_id, name=args.tag_name)
if tag is None:
    print(f"Tag '{args.tag_name}' does not exist in project '{project['title']}'!")
    exit()

sdoc_ids = api.read_all_sdoc_ids_by_tags(proj_id=args.project_id, tags=[tag["id"]])
print(
    f"Found {len(sdoc_ids)} documents with tag '{args.tag_name}' in project '{project['title']}'!"
)
# Ask for confirmation
confirm = input(
    f"Are you sure you want to delete all {len(sdoc_ids)} documents with tag '{args.tag_name}' in project '{project['title']}'? (yes/no): "
)
if confirm.lower() != "yes":
    print("Aborting deletion.")
    exit()

# Delete all sdocs with the given tag
for sdoc_id in tqdm(sdoc_ids, desc="Deleting documents..."):
    try:
        api.delete_sdoc_by_id(sdoc_id)
    except Exception as e:
        print(f"Error deleting sdoc with ID {sdoc_id}: {e}")
