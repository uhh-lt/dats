import json
from time import sleep
from typing import List

import requests


class DWTSAPI:
    def __init__(self, base_path="http://localhost:14140/"):
        self.BASE_PATH = base_path

    def read_all_projects(self):
        r = requests.get(self.BASE_PATH + "project")
        r.raise_for_status()
        return r.json()

    def get_sdoc_id_by_filename(self, proj_id: int, filename: str):
        r = requests.post(
            self.BASE_PATH + "search/lexical/sdoc/filename",
            data=json.dumps(
                {"proj_id": proj_id, "filename_query": filename, "prefix": False}
            ),
        )
        r.raise_for_status()
        r = r.json()
        if len(r["hits"]) == 0:
            print(f"Could not find sdoc_id of file {filename}! Retrying...")
            sleep(1)
            self.get_sdoc_id_by_filename(proj_id, filename)
        return r["hits"][0]["sdoc_id"]

    def get_proj_by_title(self, title: str):
        projects = self.read_all_projects()
        try:
            idx = list(map(lambda x: x["title"], projects)).index(title)
            return projects[idx]
        except ValueError:
            return None

    def read_all_sdocs(self, project_id: int):
        # get all sdoc ids
        r = requests.post(
            self.BASE_PATH + f"search/sdoc",
            data=json.dumps(
                {
                    "proj_id": project_id,
                }
            ),
        )
        r.raise_for_status()
        return r.json()

    def read_all_sdocs_by_tags(self, project_id: int, tags: List[int]):
        # get all sdoc ids
        r = requests.post(
            self.BASE_PATH + f"search/sdoc",
            data=json.dumps(
                {"proj_id": project_id, "tag_ids": tags, "all_tags": False}
            ),
        )
        r.raise_for_status()
        return r.json()

    def create_project(self, title: str, description: str):
        r = requests.put(
            self.BASE_PATH + "project",
            data=json.dumps({"title": title, "description": description}),
        )
        r.raise_for_status()
        project = r.json()
        print(f"Created project with id {project['id']}.")
        return project

    def upload_files(self, proj_id: int, files):
        # upload files
        r = requests.put(self.BASE_PATH + f"project/{proj_id}/sdoc", files=files)
        r.raise_for_status()
        print(f"Started uploading {len(files)} files.")
        return len(files)

    def read_project_status(self, project_id: int):
        r = requests.get(self.BASE_PATH + f"prepro/project/{project_id}/status")
        r.raise_for_status()
        return r.json()

    def read_all_tags(self, project_id: int):
        r = requests.get(self.BASE_PATH + f"project/{project_id}/tag")
        r.raise_for_status()
        return r.json()

    def create_tag(self, title: str, description: str, color: str, project_id: int):
        r = requests.put(
            self.BASE_PATH + f"doctag",
            data=json.dumps(
                {
                    "title": title,
                    "description": description,
                    "color": color,
                    "project_id": project_id,
                }
            ),
        )
        r.raise_for_status()
        tag = r.json()
        print(f"Created tag {tag['id']}")
        return tag

    def get_tag_by_title(self, proj_id: int, title: str):
        tags = self.read_all_tags(project_id=proj_id)
        try:
            idx = list(map(lambda x: x["title"], tags)).index(title)
            return tags[idx]
        except ValueError:
            return None

    def bulk_apply_tags(self, sdoc_ids: List[int], tag_ids: List[int]):
        if len(sdoc_ids) == 0 or len(tag_ids) == 0:
            print(f"Could not apply tags {tag_ids} to documents {sdoc_ids}!")
            return

        r = requests.patch(
            self.BASE_PATH + "doctag/bulk/link",
            data=json.dumps(
                {"source_document_ids": sdoc_ids, "document_tag_ids": tag_ids}
            ),
        )
        r.raise_for_status()
        print(f"Applied tags {tag_ids} to all documents!")

    def create_origin_metadata(self, sdoc_id: int, url: str):
        r = requests.put(
            self.BASE_PATH + "metadata",
            data=json.dumps(
                {
                    "key": "origin",
                    "value": url,
                    "source_document_id": sdoc_id,
                    "read_only": True,
                }
            ),
        )
        r.raise_for_status()
        print(f"Added metadata 'origin': '{url}' to sdoc {sdoc_id}!")
