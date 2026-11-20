"""The calls of the DATS API that the converter needs."""

import json
from typing import Any

import requests


class DATSAPI:
    def __init__(self, base_path: str, username: str, password: str):
        self.BASE_PATH = base_path if base_path.endswith("/") else base_path + "/"
        self.username = username
        self.password = password
        self.access_token = None
        self.refresh_token = None

    def _auth(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.access_token}"}

    def _auth_json(self) -> dict[str, str]:
        return {**self._auth(), "Content-Type": "application/json"}

    # LOGIN

    def login(self) -> None:
        r = requests.post(
            self.BASE_PATH + "authentication/login",
            headers={
                "accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"username": self.username, "password": self.password},
        )
        r.raise_for_status()
        data = r.json()
        self.access_token = data["access_token"]
        self.refresh_token = data["refresh_token"]

    def refresh_login(self) -> None:
        r = requests.post(
            self.BASE_PATH
            + f"authentication/refresh_access?refresh_token={self.refresh_token}",
            headers={"accept": "application/json"},
        )
        r.raise_for_status()
        data = r.json()
        self.access_token = data["access_token"]
        self.refresh_token = data["refresh_token"]

    # PROJECTS

    def get_project_by_id(self, project_id: int) -> dict[str, Any]:
        r = requests.get(self.BASE_PATH + f"project/{project_id}", headers=self._auth())
        r.raise_for_status()
        return r.json()

    # SDOCS

    def read_all_sdoc_ids(self, project_id: int) -> list[int]:
        r = requests.post(
            self.BASE_PATH
            + f"search/sdoc?search_query=%20&project_id={project_id}"
            + "&expert_mode=false&highlight=false",
            data=json.dumps(
                {
                    "filter": {"id": "all", "items": [], "logic_operator": "or"},
                    "sorts": [],
                }
            ),
            headers=self._auth_json(),
        )
        r.raise_for_status()
        sdocs: dict[str, dict] = r.json()["sdocs"]
        return [int(sdoc_id) for sdoc_id in sdocs.keys()]

    # METADATA

    def read_all_project_metadata(self, project_id: int) -> list[dict[str, Any]]:
        r = requests.get(
            self.BASE_PATH + f"projmeta/project/{project_id}", headers=self._auth()
        )
        r.raise_for_status()
        return r.json()

    def create_project_metadata(
        self, project_id: int, key: str, metatype: str, doctype: str, description: str
    ) -> dict[str, Any]:
        # creating it gives every document of the doctype a default value
        r = requests.put(
            self.BASE_PATH + "projmeta",
            data=json.dumps(
                {
                    "key": key,
                    "metatype": metatype,
                    "read_only": False,
                    "doctype": doctype,
                    "description": description,
                    "project_id": project_id,
                }
            ),
            headers=self._auth_json(),
        )
        r.raise_for_status()
        return r.json()

    def read_all_sdoc_metadata(self, sdoc_id: int) -> list[dict[str, Any]]:
        r = requests.get(
            self.BASE_PATH + f"sdocmeta/sdoc/{sdoc_id}", headers=self._auth()
        )
        r.raise_for_status()
        return r.json()

    def bulk_update_sdoc_metadata(
        self, updates: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        # each update: sdoc_metadata_id and all five value fields
        # (str/int/date/boolean/list_value), exactly one of them not None
        r = requests.patch(
            self.BASE_PATH + "sdocmeta/bulk/update",
            data=json.dumps(updates),
            headers=self._auth_json(),
        )
        r.raise_for_status()
        return r.json()
