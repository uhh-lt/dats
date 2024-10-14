import json
from time import sleep
from typing import Any, Dict, List, Optional, Tuple, Union
from urllib.parse import quote

import requests


class DATSAPI:
    def __init__(
        self,
        base_path: str = "http://localhost:14140/",
        username: str = "SYSTEM@dats.org",
        password: str = "12SYSTEM34",
    ):
        self.BASE_PATH = base_path
        self.username = username
        self.password = password
        self.access_token = None
        self.refresh_token = None
        self.token_type = None
        self.user_id = None

    # LOGIN
    def login(self):
        headers = {
            "accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = {
            "grant_type": "",
            "username": self.username,
            "password": self.password,
            "scope": "",
            "client_id": "",
            "client_secret": "",
        }
        r = requests.post(
            f"{self.BASE_PATH}authentication/login", headers=headers, data=data
        )
        r.raise_for_status()
        data = r.json()
        self.access_token = data["access_token"]
        self.refresh_token = data["refresh_token"]
        self.token_type = data["token_type"]
        print("Logged in!")

    def refresh_login(self):
        headers = {
            "accept": "application/json",
        }
        r = requests.post(
            f"{self.BASE_PATH}authentication/refresh_access?refresh_token={self.refresh_token}",
            headers=headers,
        )
        r.raise_for_status()
        data = r.json()
        self.access_token = data["access_token"]
        self.refresh_token = data["refresh_token"]
        self.token_type = data["token_type"]
        print("Refreshed login!")

    def me(self):
        r = requests.get(
            self.BASE_PATH + "user/me",
            headers={"Authorization": f"Bearer {self.access_token}"},
        )
        r.raise_for_status()
        data = r.json()
        self.user_id = data["id"]

    # PROJECTS

    def create_project(self, title: str, description: str):
        r = requests.put(
            self.BASE_PATH + "project",
            data=json.dumps({"title": title, "description": description}),
            headers={"Authorization": f"Bearer {self.access_token}"},
        )
        r.raise_for_status()
        project = r.json()
        print(f"Created project with id {project['id']}.")
        return project

    def get_proj_by_id(self, proj_id: int):
        r = requests.get(
            self.BASE_PATH + f"project/{proj_id}",
            headers={"Authorization": f"Bearer {self.access_token}"},
        )
        r.raise_for_status()
        return r.json()

    def get_proj_by_title(self, title: str):
        projects = self.read_all_projects()
        try:
            idx = list(map(lambda x: x["title"], projects)).index(title)
            return projects[idx]
        except ValueError:
            return None

    def read_all_projects(self):
        r = requests.get(
            self.BASE_PATH + f"user/{self.user_id}/project",
            headers={"Authorization": f"Bearer {self.access_token}"},
        )
        r.raise_for_status()
        return r.json()

    def read_project_status(self, proj_id: int) -> Dict[str, Any]:
        r = requests.get(
            self.BASE_PATH + f"prepro/project/{proj_id}/status",
            headers={"Authorization": f"Bearer {self.access_token}"},
        )
        r.raise_for_status()
        return r.json()

    # PREPROCESSING JOB

    def read_preprocessing_job_status(self, preprojob_id: int) -> Dict[str, Any]:
        r = requests.get(
            self.BASE_PATH + f"prepro/{preprojob_id}",
            headers={"Authorization": f"Bearer {self.access_token}"},
        )
        r.raise_for_status()
        return r.json()

    # SDOCS

    def resolve_sdoc_id_from_proj_and_filename(
        self, proj_id: int, filename: str
    ) -> Optional[int]:
        try:
            r = requests.get(
                self.BASE_PATH
                + f"project/{proj_id}/resolve_filename/{quote(filename)}?only_finished=false",
                headers={"Authorization": f"Bearer {self.access_token}"},
            )
            sdoc_id = r.json()
            return sdoc_id
        except Exception:
            return None

    def read_all_sdocIDs(self, proj_id: int):
        # get all sdoc ids
        r = requests.post(
            self.BASE_PATH
            + f"search/sdoc?search_query=%20&project_id={proj_id}&expert_mode=false&highlight=false",
            data=json.dumps(
                {"filter": {"items": [], "logic_operator": "or"}, "sorts": []}
            ),
            headers={"Authorization": f"Bearer {self.access_token}"},
        )
        r.raise_for_status()
        hits = r.json()["hits"]
        return [hit["document_id"] for hit in hits]

    def read_all_sdocIDs_by_tags(self, proj_id: int, tags: List[int]):
        # get all sdoc ids
        r = requests.post(
            self.BASE_PATH
            + f"search/sdoc?search_query=%20&project_id={proj_id}&expert_mode=false&highlight=false",
            data=json.dumps(
                {
                    "filter": {
                        "items": [
                            {
                                "column": "SC_DOCUMENT_TAG_ID_LIST",
                                "operator": "ID_LIST_CONTAINS",
                                "value": tag,
                            }
                            for tag in tags
                        ],
                        "logic_operator": "and",
                    },
                    "sorts": [],
                }
            ),
            headers={"Authorization": f"Bearer {self.access_token}"},
        )
        r.raise_for_status()
        hits = r.json()["hits"]
        return [hit["document_id"] for hit in hits]

    def upload_files(
        self,
        proj_id: int,
        files: List[Tuple[str, Tuple[str, bytes, str]]],
        filter_duplicate_files_before_upload: bool = False,
    ) -> Dict[str, Any] | None:
        # upload files
        if filter_duplicate_files_before_upload:
            print("Filtering files to upload ...")
            # filter the files so that only new files with a non-existing filename get uploaded
            filtered_files = []
            for file in files:
                dict_key, (fname, content, mime) = file
                sdoc_id = self.resolve_sdoc_id_from_proj_and_filename(
                    proj_id=proj_id, filename=fname
                )
                if sdoc_id is None:
                    filtered_files.append(file)
            print(f"Filtered {len(files) - len(filtered_files)} files !")
            files = filtered_files

        if len(files) > 0:
            r = requests.put(
                self.BASE_PATH + f"project/{proj_id}/sdoc",
                files=files,
                headers={"Authorization": f"Bearer {self.access_token}"},
            )
            r.raise_for_status()
            return r.json()
            print(f"Started uploading {len(files)} files.")
        else:
            print("No files to upload!")
            return None

    # TAGS

    def create_tag(self, name: str, description: str, color: str, proj_id: int):
        r = requests.put(
            self.BASE_PATH + "doctag",
            data=json.dumps(
                {
                    "name": name,
                    "description": description,
                    "color": color,
                    "project_id": proj_id,
                }
            ),
            headers={"Authorization": f"Bearer {self.access_token}"},
        )
        r.raise_for_status()
        tag = r.json()
        print(f"Created tag {tag['id']}")
        return tag

    def read_all_tags(self, proj_id: int):
        r = requests.get(
            self.BASE_PATH + f"project/{proj_id}/tag",
            headers={"Authorization": f"Bearer {self.access_token}"},
        )
        r.raise_for_status()
        return r.json()

    def get_tag_by_name(self, proj_id: int, name: str):
        tags = self.read_all_tags(proj_id=proj_id)
        try:
            idx = list(map(lambda x: x["name"], tags)).index(name)
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
            headers={"Authorization": f"Bearer {self.access_token}"},
        )
        r.raise_for_status()
        print(f"Applied tags {tag_ids} to documents {sdoc_ids}!")

    # METADATA
    def create_project_metadata(
        self, proj_id: int, key: str, metatype: str, doctype: str, description: str
    ):
        # metatype is STRING DATE BOOLEAN NUMBER LIST
        # doctype is text image video audio
        r = requests.put(
            self.BASE_PATH + "projmeta",
            data=json.dumps(
                {
                    "key": key,
                    "metatype": metatype,
                    "read_only": False,
                    "doctype": doctype,
                    "description": description,
                    "project_id": proj_id,
                }
            ),
            headers={"Authorization": f"Bearer {self.access_token}"},
        )
        r.raise_for_status()
        print(f"Create project metadata {r.json()}!")
        return r.json()

    def read_all_project_metadata(self, proj_id: int):
        r = requests.get(
            self.BASE_PATH + f"project/{proj_id}/metadata",
            headers={"Authorization": f"Bearer {self.access_token}"},
        )
        r.raise_for_status()
        return r.json()

    def read_sdoc_metadata_by_key(self, sdoc_id: int, key: str):
        r = requests.get(
            self.BASE_PATH + f"sdoc/{sdoc_id}/metadata/{key}",
            headers={"Authorization": f"Bearer {self.access_token}"},
        )
        r.raise_for_status()
        return r.json()

    def update_sdoc_metadata(
        self,
        sdoc_id: int,
        key: str,
        value: Union[str, int, bool, List[str]],
        metatype: str,
    ):
        sdoc_metadata = self.read_sdoc_metadata_by_key(sdoc_id=sdoc_id, key=key)

        r = requests.patch(
            self.BASE_PATH + f"sdocmeta/{sdoc_metadata['id']}",
            data=json.dumps(
                {
                    "str_value": value if metatype == "STRING" else None,
                    "int_value": value if metatype == "NUMBER" else None,
                    "date_value": value if metatype == "DATE" else None,
                    "boolean_value": value if metatype == "BOOLEAN" else None,
                    "list_value": value if metatype == "LIST" else None,
                }
            ),
            headers={"Authorization": f"Bearer {self.access_token}"},
        )
        r.raise_for_status()
        return r.json()


# main (test that everything works)
if __name__ == "__main__":
    dats = DATSAPI(base_path="http://localhost:19220/")
    dats.login()
    dats.me()

    # create project
    project = dats.create_project(title="test", description="test")
    print("created project", project)

    # get project
    project = dats.get_proj_by_title(title="test")
    assert project is not None
    print("got project by title", project)

    # get project
    project = dats.get_proj_by_id(proj_id=project["id"])
    print("got project by id", project)

    # get all projects
    projects = dats.read_all_projects()
    print("got all projects", projects)

    # get project status
    status = dats.read_project_status(proj_id=project["id"])
    print("got project status", status)

    # create tag
    tag = dats.create_tag(
        name="test tag", description="my test tag", color="blue", proj_id=project["id"]
    )
    print("created tag", tag)

    # get tag
    tag = dats.get_tag_by_name(proj_id=project["id"], name="test tag")
    assert tag is not None
    print("got tag", tag)

    # get tags
    tags = dats.read_all_tags(proj_id=project["id"])
    print("got tags", tags)

    # status before upload
    status = dats.read_project_status(proj_id=project["id"])
    sdocs_in_project = status["num_sdocs_finished"]

    # file upload
    from pathlib import Path

    import magic

    files: List[Tuple[str, Tuple[str, bytes, str]]] = []
    for file in Path("./test_files").iterdir():
        if not file.is_file() or file.suffix != ".txt":
            continue

        file_bytes = file.read_bytes()
        mime = magic.from_buffer(file_bytes, mime=True)
        files.append(("uploaded_files", (file.name, file_bytes, mime)))

    num_files_to_upload = dats.upload_files(
        proj_id=project["id"], files=files, filter_duplicate_files_before_upload=True
    )

    # wait for pre-processing to finishe
    status = dats.read_project_status(proj_id=project["id"])
    while status["num_sdocs_finished"] != (sdocs_in_project + num_files_to_upload):
        sleep(1)
        status = dats.read_project_status(proj_id=project["id"])
        print(
            f"Uploading documents. Current status: {status['num_sdocs_finished'] - sdocs_in_project} / {num_files_to_upload}"
        )

    print("Upload success!")

    # get all sdocs
    sdoc_ids = dats.read_all_sdocIDs(proj_id=project["id"])
    print("got all sdocs ids", sdoc_ids)

    # bulk apply tags
    dats.bulk_apply_tags(sdoc_ids=sdoc_ids, tag_ids=[tag["id"]])

    # read all sdocs by tags
    sdoc_ids = dats.read_all_sdocIDs_by_tags(proj_id=project["id"], tags=[tag["id"]])
    print("got all sdocs ids by tags", sdoc_ids)

    # create project metadata
    project_metadata = dats.create_project_metadata(
        proj_id=project["id"], key="sdoc_id", metatype="STRING", doctype="text", description="sdoc_id"
    )
    project_metadata = dats.create_project_metadata(
        proj_id=project["id"], key="sdoc_id", metatype="STRING", doctype="image", description="sdoc_id"
    )
    print("created project metadata", project_metadata)

    # get all project metadata
    project_metadatas = dats.read_all_project_metadata(proj_id=project["id"])
    print("got all project metadata", project_metadatas)

    # update sdoc metadata
    for sdoc_id in sdoc_ids:
        sdoc_metadata = dats.update_sdoc_metadata(
            sdoc_id=sdoc_id,
            value=f"meine id ist {sdoc_id}",
            key="sdoc_id",
            metatype="STRING",
        )
        print("updated sdoc metadata", sdoc_metadata)
