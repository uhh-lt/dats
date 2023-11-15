import json
from time import sleep
from typing import Any, Dict, List, Optional, Tuple

import requests


class DWTSAPI:
    def __init__(self, base_path: str = "http://localhost:14140/"):
        self.BASE_PATH = base_path

    def read_all_projects(self):
        r = requests.get(self.BASE_PATH + "project")
        r.raise_for_status()
        return r.json()

    def get_sdoc_id_by_filename(
        self, proj_id: int, filename: str, retry: bool = True
    ) -> Optional[int]:
        r = requests.post(
            self.BASE_PATH + "search/lexical/sdoc/filename",
            data=json.dumps(
                {"proj_id": proj_id, "filename_query": filename, "prefix": False}
            ),
        )

        r.raise_for_status()
        r = r.json()
        if len(r["hits"]) == 0:
            if retry:
                print(f"Could not find sdoc_id of file {filename}! Retrying...")
                sleep(1)
                return self.get_sdoc_id_by_filename(proj_id, filename)
            return None
        return r["hits"][0]["sdoc_id"]

    def resolve_sdoc_id_from_proj_and_filename(
        self, proj_id: int, filename: str
    ) -> Optional[int]:
        r = requests.get(
            self.BASE_PATH
            + f"project/{proj_id}/resolve_filename/{filename}?only_finished=false"
        )
        r.raise_for_status()
        try:
            sdoc_id = r.json()
            return sdoc_id
        except:
            return None

    def get_proj_by_title(self, title: str):
        projects = self.read_all_projects()
        try:
            idx = list(map(lambda x: x["title"], projects)).index(title)
            return projects[idx]
        except ValueError:
            return None

    def get_proj_by_id(self, proj_id: int):
        r = requests.get(self.BASE_PATH + f"project/{proj_id}")
        r.raise_for_status()
        return r.json()

    def read_all_sdocs(self, project_id: int):
        # get all sdoc ids
        r = requests.post(
            self.BASE_PATH + "search/sdoc",
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
            self.BASE_PATH + "search/sdoc",
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

    def upload_files(
        self,
        proj_id: int,
        files: List[Tuple[str, Tuple[str, bytes, str]]],
        filter_duplicate_files_before_upload: bool = False,
    ) -> int:
        # upload files
        if filter_duplicate_files_before_upload:
            print("Filtering files to upload ...")
            # filter the files so that only new files with a non-existing filename get uploaded
            filtered_files = []
            for file in files:
                dict_key, (fname, content, mime) = file
                sdoc_id = self.get_sdoc_id_by_filename(
                    proj_id=proj_id, filename=fname, retry=False
                )
                if sdoc_id is not None:
                    filtered_files.append(file)
            print(f"Filtered {len(files) - len(filtered_files)} files !")
            files = filtered_files

        r = requests.put(self.BASE_PATH + f"project/{proj_id}/sdoc", files=files)
        r.raise_for_status()
        print(f"Started uploading {len(files)} files.")
        return len(files)

    def read_project_status(self, project_id: int) -> Dict[str, Any]:
        r = requests.get(self.BASE_PATH + f"prepro/project/{project_id}/status")
        r.raise_for_status()
        return r.json()

    def read_all_tags(self, project_id: int):
        r = requests.get(self.BASE_PATH + f"project/{project_id}/tag")
        r.raise_for_status()
        return r.json()

    def create_tag(self, title: str, description: str, color: str, project_id: int):
        r = requests.put(
            self.BASE_PATH + "doctag",
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

    def create_metadata(self, sdoc_id: int, key: str, value: str):
        r = requests.put(
            self.BASE_PATH + "metadata",
            data=json.dumps(
                {
                    "key": key,
                    "value": value,
                    "source_document_id": sdoc_id,
                    "read_only": True,
                }
            ),
        )
        if r.status_code == 409 or r.status_code == 200:
            print(f"Added metadata '{key}': '{value}' to sdoc {sdoc_id}!")
        else:
            r.raise_for_status()
